import type {
  Cog,
  CogPacket,
  MoleculeResult,
  ReleaseProjection,
  ValidationResult,
} from "./types.js";

export type CogMoleculeRuntimeOptions = {
  cogs: Cog[];
  validate(packet: CogPacket): Promise<ValidationResult>;
  project(packet: CogPacket, reasons: string[]): Promise<ReleaseProjection>;
  maxRounds?: number;
  convergenceEpsilon?: number;
  releaseFriction?: number;
  frictionWeights?: Partial<FrictionWeights>;
};

type FrictionWeights = {
  unresolved: number;
  contradiction: number;
  challenge: number;
  uncertainty: number;
};

const DEFAULT_WEIGHTS: FrictionWeights = {
  unresolved: 0.2,
  contradiction: 0.25,
  challenge: 0.3,
  uncertainty: 0.25,
};

export class CogMoleculeRuntime {
  private readonly maxRounds: number;
  private readonly convergenceEpsilon: number;
  private readonly releaseFriction: number;
  private readonly frictionWeights: FrictionWeights;

  constructor(private readonly options: CogMoleculeRuntimeOptions) {
    if (!options.cogs.length) throw new Error("cog_molecule_requires_cogs");
    this.maxRounds = options.maxRounds ?? 32;
    this.convergenceEpsilon = options.convergenceEpsilon ?? 0.01;
    this.releaseFriction = options.releaseFriction ?? 0.05;
    this.frictionWeights = { ...DEFAULT_WEIGHTS, ...options.frictionWeights };
  }

  async run(initial: CogPacket): Promise<MoleculeResult> {
    let packet = normalizePacket(structuredClone(initial));
    packet.friction = this.measureFriction(packet);
    const reasons: string[] = [];
    let previousSignature = packetSignature(packet);
    let computeSpent = 0;

    for (let round = 1; round <= this.maxRounds; round += 1) {
      for (const cog of this.options.cogs) {
        const observation = await cog.process(packet, { round, maxRounds: this.maxRounds });
        packet = normalizePacket(observation.packet);
        packet.circulation = round;
        computeSpent += 1;
        reasons.push(...observation.reasons.map((reason) => `${cog.id}: ${reason}`));
      }

      // Cogs may alter evidence/hypotheses/unresolved state, but they do not get
      // to declare their own processing pressure. The runtime derives friction
      // from the live state after the whole circulation.
      packet.friction = this.measureFriction(packet);
      const signature = packetSignature(packet);
      const converged = signature === previousSignature;
      previousSignature = signature;

      if (converged && packet.friction <= this.releaseFriction) {
        const validation = await this.options.validate(packet);
        reasons.push(...validation.reasons);

        if (validation.seek?.length) {
          packet.unresolved = unique([...packet.unresolved, ...validation.seek]);
          packet.friction = this.measureFriction(packet);
          return {
            disposition: "seek_more_information",
            packet,
            rounds: round,
            reasons,
            computeSpent,
          };
        }

        if (validation.valid && packet.unresolved.length === 0 && unresolvedChallenges(packet) === 0) {
          const projection = await this.options.project(packet, reasons);
          return {
            disposition: projection.disposition,
            packet,
            projection,
            rounds: round,
            reasons,
            computeSpent,
          };
        }

        // Stability is not validity. Reopen a concrete challenge so the failed
        // validation remains addressable instead of becoming anonymous heat.
        packet.challenges.push({
          id: `validation:${round}:${packet.challenges.length}`,
          source: "validator",
          target: packet.destination ?? packet.id,
          reason: validation.reasons.join("; ") || "validation failed",
          provenance: [...packet.provenance],
          resolved: false,
        });
        packet.friction = this.measureFriction(packet);
        previousSignature = "validation_reopened";
      }
    }

    return {
      disposition: packet.unresolved.length || unresolvedChallenges(packet) ? "circulate" : "abstain",
      packet,
      rounds: this.maxRounds,
      reasons: [...reasons, "compute boundary reached without validated release"],
      computeSpent,
    };
  }

  private measureFriction(packet: CogPacket): number {
    const unresolvedPressure = saturating(packet.unresolved.length);
    const contradictionPressure = saturating(
      packet.hypotheses.reduce((sum, hypothesis) => sum + hypothesis.contradictions.length, 0),
    );
    const challengePressure = saturating(unresolvedChallenges(packet));
    const uncertaintyPressure = packet.hypotheses.length
      ? packet.hypotheses.reduce((sum, hypothesis) => sum + (1 - clamp01(hypothesis.confidence)), 0) /
        packet.hypotheses.length
      : 0;

    return clamp01(
      unresolvedPressure * this.frictionWeights.unresolved +
        contradictionPressure * this.frictionWeights.contradiction +
        challengePressure * this.frictionWeights.challenge +
        uncertaintyPressure * this.frictionWeights.uncertainty,
    );
  }
}

function normalizePacket(packet: CogPacket): CogPacket {
  return {
    ...packet,
    unresolved: unique(packet.unresolved ?? []),
    challenges: packet.challenges ?? [],
    provenance: unique(packet.provenance ?? []),
  };
}

function unresolvedChallenges(packet: CogPacket): number {
  return packet.challenges.filter((challenge) => !challenge.resolved).length;
}

function packetSignature(packet: CogPacket): string {
  return JSON.stringify({
    evidence: packet.evidence,
    hypotheses: packet.hypotheses,
    unresolved: packet.unresolved,
    challenges: packet.challenges,
    provenance: packet.provenance,
    destination: packet.destination,
  });
}

function saturating(count: number): number {
  return count <= 0 ? 0 : count / (count + 1);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
import { AdaptiveComputePolicy } from "./adaptiveCompute.js";
import type { Cog, CogEvidence, CogHypothesis, CogChallenge, CogPacket, MoleculeResult, ReleaseProjection, ValidationResult } from "./types.js";

export type CogMoleculeRuntimeOptions = {
  cogs: Cog[];
  validate(packet: CogPacket): Promise<ValidationResult>;
  project(packet: CogPacket, reasons: string[]): Promise<ReleaseProjection>;
  maxRounds?: number;
  adaptiveCompute?: AdaptiveComputePolicy;
  convergenceEpsilon?: number;
  releaseFriction?: number;
  frictionWeights?: Partial<FrictionWeights>;
};

type FrictionWeights = { unresolved: number; contradiction: number; challenge: number; uncertainty: number };
const DEFAULT_WEIGHTS: FrictionWeights = { unresolved: 0.2, contradiction: 0.25, challenge: 0.3, uncertainty: 0.25 };

export class CogMoleculeRuntime {
  private readonly configuredMaxRounds: number;
  private readonly releaseFriction: number;
  private readonly frictionWeights: FrictionWeights;

  constructor(private readonly options: CogMoleculeRuntimeOptions) {
    if (!options.cogs.length) throw new Error("cog_molecule_requires_cogs");
    this.configuredMaxRounds = options.maxRounds ?? 32;
    this.releaseFriction = options.releaseFriction ?? 0.05;
    this.frictionWeights = { ...DEFAULT_WEIGHTS, ...options.frictionWeights };
  }

  async run(initial: CogPacket): Promise<MoleculeResult> {
    let packet = normalizePacket(structuredClone(initial));
    packet.friction = this.measureFriction(packet);
    const initialDecision = this.options.adaptiveCompute?.decide(packet.friction);
    let effectiveMaxRounds = Math.min(this.configuredMaxRounds, initialDecision?.maxRounds ?? this.configuredMaxRounds);
    const reasons: string[] = initialDecision ? [`adaptive_compute: ${initialDecision.reason}`] : [];
    let previousSignature = packetSignature(packet);
    let computeSpent = 0;
    let round = 0;

    while (round < effectiveMaxRounds) {
      round += 1;
      for (const cog of this.options.cogs) {
        const observation = await cog.process(packet, { round, maxRounds: effectiveMaxRounds });
        packet = normalizePacket(observation.packet);
        packet.circulation = round;
        computeSpent += 1;
        reasons.push(...observation.reasons.map((reason) => `${cog.id}: ${reason}`));
      }

      packet.friction = this.measureFriction(packet);
      const nextDecision = this.options.adaptiveCompute?.decide(packet.friction);
      if (nextDecision) {
        const proposedMax = Math.min(this.configuredMaxRounds, nextDecision.maxRounds);
        if (proposedMax > effectiveMaxRounds) { effectiveMaxRounds = proposedMax; reasons.push(`adaptive_compute_escalated: ${nextDecision.reason}`); }
      }

      const signature = packetSignature(packet);
      const converged = signature === previousSignature;
      previousSignature = signature;

      if (converged && packet.friction <= this.releaseFriction) {
        const validation = await this.options.validate(packet);
        reasons.push(...validation.reasons);
        if (validation.seek?.length) {
          packet.unresolved = unique([...packet.unresolved, ...validation.seek]);
          packet.friction = this.measureFriction(packet);
          return { disposition: "seek_more_information", packet, rounds: round, reasons, computeSpent };
        }
        if (validation.valid && packet.unresolved.length === 0 && unresolvedChallenges(packet) === 0) {
          const projection = await this.options.project(packet, reasons);
          return { disposition: projection.disposition, packet, projection, rounds: round, reasons, computeSpent };
        }
        packet.challenges.push({ id: `validation:${round}:${packet.challenges.length}`, source: "validator", target: packet.destination ?? packet.id, reason: validation.reasons.join("; ") || "validation failed", provenance: [...packet.provenance], resolved: false });
        packet = normalizePacket(packet);
        packet.friction = this.measureFriction(packet);
        previousSignature = "validation_reopened";
        const reopenedDecision = this.options.adaptiveCompute?.decide(packet.friction);
        if (reopenedDecision) {
          const proposedMax = Math.min(this.configuredMaxRounds, reopenedDecision.maxRounds);
          if (proposedMax > effectiveMaxRounds) { effectiveMaxRounds = proposedMax; reasons.push(`adaptive_compute_escalated: ${reopenedDecision.reason}`); }
        }
      }
    }

    return { disposition: packet.unresolved.length || unresolvedChallenges(packet) ? "circulate" : "abstain", packet, rounds: round, reasons: [...reasons, "compute boundary reached without validated release"], computeSpent };
  }

  private measureFriction(packet: CogPacket): number {
    const unresolvedPressure = saturating(packet.unresolved.length);
    const contradictionPressure = saturating(packet.hypotheses.reduce((sum, h) => sum + h.contradictions.length, 0));
    const challengePressure = saturating(unresolvedChallenges(packet));
    const uncertaintyPressure = packet.hypotheses.length ? packet.hypotheses.reduce((sum, h) => sum + (1 - clamp01(h.confidence)), 0) / packet.hypotheses.length : 0;
    return clamp01(unresolvedPressure * this.frictionWeights.unresolved + contradictionPressure * this.frictionWeights.contradiction + challengePressure * this.frictionWeights.challenge + uncertaintyPressure * this.frictionWeights.uncertainty);
  }
}

function normalizePacket(packet: CogPacket): CogPacket {
  return {
    ...packet,
    evidence: dedupeExact(packet.evidence ?? []),
    hypotheses: dedupeExact(packet.hypotheses ?? []),
    unresolved: unique(packet.unresolved ?? []),
    challenges: dedupeExact(packet.challenges ?? []),
    provenance: unique(packet.provenance ?? []),
  };
}
function dedupeExact<T extends CogEvidence | CogHypothesis | CogChallenge>(values: T[]): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = JSON.stringify(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function unresolvedChallenges(packet: CogPacket): number { return packet.challenges.filter((challenge) => !challenge.resolved).length; }
function packetSignature(packet: CogPacket): string { return JSON.stringify({ evidence: packet.evidence, hypotheses: packet.hypotheses, unresolved: packet.unresolved, challenges: packet.challenges, provenance: packet.provenance, destination: packet.destination }); }
function saturating(count: number): number { return count <= 0 ? 0 : count / (count + 1); }
function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
function unique(values: string[]): string[] { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }

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
};

export class CogMoleculeRuntime {
  private readonly maxRounds: number;
  private readonly convergenceEpsilon: number;
  private readonly releaseFriction: number;

  constructor(private readonly options: CogMoleculeRuntimeOptions) {
    if (!options.cogs.length) throw new Error("cog_molecule_requires_cogs");
    this.maxRounds = options.maxRounds ?? 32;
    this.convergenceEpsilon = options.convergenceEpsilon ?? 0.01;
    this.releaseFriction = options.releaseFriction ?? 0.05;
  }

  async run(initial: CogPacket): Promise<MoleculeResult> {
    let packet = structuredClone(initial);
    const reasons: string[] = [];
    let previousFriction = Number.POSITIVE_INFINITY;

    for (let round = 1; round <= this.maxRounds; round += 1) {
      let roundDelta = 0;

      // Movement through the circle is processing: every cog receives the
      // current live packet, including unresolved and competing hypotheses.
      for (const cog of this.options.cogs) {
        const observation = await cog.process(packet, {
          round,
          maxRounds: this.maxRounds,
        });
        packet = observation.packet;
        packet.circulation = round;
        roundDelta += Math.abs(observation.frictionDelta);
        reasons.push(...observation.reasons.map((reason) => `${cog.id}: ${reason}`));
      }

      const converged =
        Math.abs(previousFriction - packet.friction) <= this.convergenceEpsilon &&
        roundDelta <= this.convergenceEpsilon;
      previousFriction = packet.friction;

      // Stability is not validity. A stable packet still has to earn release.
      if (converged && packet.friction <= this.releaseFriction) {
        const validation = await this.options.validate(packet);
        reasons.push(...validation.reasons);

        if (validation.seek?.length) {
          packet.unresolved = unique([...packet.unresolved, ...validation.seek]);
          return {
            disposition: "seek_more_information",
            packet,
            rounds: round,
            reasons,
          };
        }

        if (validation.valid && packet.unresolved.length === 0) {
          const projection = await this.options.project(packet, reasons);
          return {
            disposition: projection.disposition,
            packet,
            projection,
            rounds: round,
            reasons,
          };
        }

        // Validation failure reopens circulation instead of laundering a
        // converged mistake into an assertion.
        packet.friction = Math.max(packet.friction, this.releaseFriction * 2);
      }
    }

    return {
      disposition: packet.unresolved.length ? "circulate" : "abstain",
      packet,
      rounds: this.maxRounds,
      reasons: [...reasons, "compute boundary reached without validated release"],
    };
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
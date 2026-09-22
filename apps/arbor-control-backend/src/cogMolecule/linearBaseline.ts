import type {
  Cog,
  CogPacket,
  MoleculeResult,
  ReleaseProjection,
  ValidationResult,
} from "./types.js";

export type LinearBaselineOptions = {
  cogs: Cog[];
  validate(packet: CogPacket): Promise<ValidationResult>;
  project(packet: CogPacket, reasons: string[]): Promise<ReleaseProjection>;
};

/**
 * Deliberately simple forward-only control. It uses the same cogs, validator,
 * and projector as the recurrent runtime but gives each cog one pass and does
 * not reopen earlier work. This is a comparison baseline, not a production
 * recommendation.
 */
export class LinearBaselineRuntime {
  constructor(private readonly options: LinearBaselineOptions) {
    if (!options.cogs.length) throw new Error("linear_baseline_requires_cogs");
  }

  async run(initial: CogPacket): Promise<MoleculeResult> {
    let packet = structuredClone(initial);
    const reasons: string[] = [];
    let computeSpent = 0;

    for (const cog of this.options.cogs) {
      const observation = await cog.process(packet, { round: 1, maxRounds: 1 });
      packet = observation.packet;
      packet.circulation = 1;
      computeSpent += 1;
      reasons.push(...observation.reasons.map((reason) => `${cog.id}: ${reason}`));
    }

    const validation = await this.options.validate(packet);
    reasons.push(...validation.reasons);

    if (validation.seek?.length) {
      packet.unresolved = unique([...packet.unresolved, ...validation.seek]);
      return {
        disposition: "seek_more_information",
        packet,
        rounds: 1,
        reasons,
        computeSpent,
      };
    }

    const unresolvedChallenges = packet.challenges.filter((challenge) => !challenge.resolved).length;
    if (validation.valid && packet.unresolved.length === 0 && unresolvedChallenges === 0) {
      const projection = await this.options.project(packet, reasons);
      return {
        disposition: projection.disposition,
        packet,
        projection,
        rounds: 1,
        reasons,
        computeSpent,
      };
    }

    return {
      disposition: packet.unresolved.length || unresolvedChallenges ? "circulate" : "abstain",
      packet,
      rounds: 1,
      reasons: [...reasons, "linear baseline reached forward boundary"],
      computeSpent,
    };
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

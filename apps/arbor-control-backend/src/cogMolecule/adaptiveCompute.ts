export type ComputeTier = {
  maxRounds: number;
  frictionAtLeast: number;
};

export type ComputeDecision = {
  maxRounds: number;
  reason: string;
};

export class AdaptiveComputePolicy {
  private readonly tiers: ComputeTier[];

  constructor(tiers: ComputeTier[] = [
    { maxRounds: 4, frictionAtLeast: 0 },
    { maxRounds: 12, frictionAtLeast: 0.2 },
    { maxRounds: 32, frictionAtLeast: 0.45 },
    { maxRounds: 64, frictionAtLeast: 0.7 },
  ]) {
    this.tiers = [...tiers].sort((a, b) => a.frictionAtLeast - b.frictionAtLeast);
  }

  decide(friction: number): ComputeDecision {
    const bounded = Math.max(0, Math.min(1, friction));
    let selected = this.tiers[0];
    for (const tier of this.tiers) {
      if (bounded >= tier.frictionAtLeast) selected = tier;
    }
    return {
      maxRounds: selected.maxRounds,
      reason: `friction=${bounded.toFixed(3)} -> maxRounds=${selected.maxRounds}`,
    };
  }
}
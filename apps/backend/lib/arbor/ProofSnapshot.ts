type ProofSnapshotInput = {
  anchors: { id: string }[];
  memoryItems: { id: string }[];
  safetyTier?: string;
  rhythm?: {
    mode?: string;
    intensity?: string;
    minutesSinceLastTurn?: number;
  };
  logicGatesHit?: string[];
};

export function buildProofSnapshot(input: ProofSnapshotInput) {
  return {
    injected_anchor_ids: input.anchors.map(a => a.id),
    injected_memory_item_ids: input.memoryItems.map(m => m.id),
    safety_tier: input.safetyTier ?? 'none',
    rhythm: input.rhythm ?? {},
    logic_gates_hit: input.logicGatesHit ?? [],
    built_at: new Date().toISOString(),
  };
}

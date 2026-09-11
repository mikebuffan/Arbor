export type SkippedMaintenanceTask = {
  status: "skipped";
  reason: string;
  processed: 0;
};

/**
 * Persistent decay is quarantined until Arbor has an approved mapping from
 * the current memory_items schema to the later reinforcement-based design.
 */
export async function runMemoryDecay(): Promise<SkippedMaintenanceTask> {
  return {
    status: "skipped",
    reason: "memory_decay_schema_unavailable",
    processed: 0,
  };
}

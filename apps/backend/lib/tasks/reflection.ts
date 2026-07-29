import type { SkippedMaintenanceTask } from "@/lib/tasks/decay";

/**
 * Reflection is intentionally inactive because the live database has no
 * memory_reflections table and no replacement storage contract is approved.
 */
export async function runReflectionJob(): Promise<SkippedMaintenanceTask> {
  return {
    status: "skipped",
    reason: "memory_reflections_table_absent",
    processed: 0,
  };
}

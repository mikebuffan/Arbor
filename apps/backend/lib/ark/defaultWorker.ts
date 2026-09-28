import type { SupabaseClient } from "@supabase/supabase-js";
import { registerArkAgencyToolExecutor } from "./agencyToolExecutor";
import { ArkExecutorRegistry } from "./executorRegistry";
import { registerArkCheckpointCanaryExecutor } from "./checkpointCanaryExecutor";
import { registerArkPreviewResearchExecutor } from "./previewResearchExecutor";
import { runArkWorkerCycle, type ArkWorkerCycleResult } from "./runner";
import { SupabaseArkStore } from "./supabaseStore";

export async function runDefaultArkWorkerCycle(input: {
  supabase: SupabaseClient;
  toolSupabase?: SupabaseClient;
  workerId: string;
  maxTasks?: number;
  maxRuntimeMs?: number;
  objectiveId?: string;
  mode?: "agency" | "preview-checkpoint" | "preview-research";
}): Promise<ArkWorkerCycleResult> {
  const registry = new ArkExecutorRegistry();
  const mode = input.mode ?? "agency";
  if (mode === "agency") {
    registerArkAgencyToolExecutor({
      registry,
      supabase: input.toolSupabase ?? input.supabase,
    });
  }

  // The ordinary memory heartbeat and chat dispatcher cannot register this.
  // The dedicated Preview route must explicitly opt in, with a pinned objective.
  if (
    mode === "preview-checkpoint" &&
    process.env.ARBOR_ARK_PREVIEW_CHECKPOINT_CANARY === "true" &&
    process.env.ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT === "true" &&
    input.objectiveId &&
    input.objectiveId === process.env.ARBOR_ARK_CANARY_OBJECTIVE_ID?.trim()
  ) {
    registerArkCheckpointCanaryExecutor({
      registry,
      pinnedObjectiveId: input.objectiveId,
    });
  }

  if (
    mode === "preview-research" &&
    process.env.ARBOR_ARK_PREVIEW_RESEARCH === "true" &&
    process.env.ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT === "true" &&
    input.objectiveId &&
    input.objectiveId === process.env.ARBOR_ARK_CANARY_OBJECTIVE_ID?.trim()
  ) {
    registerArkPreviewResearchExecutor({
      registry,
      supabase: input.toolSupabase ?? input.supabase,
      pinnedObjectiveId: input.objectiveId,
    });
  }

  const store = new SupabaseArkStore(input.supabase);
  return runArkWorkerCycle({
    store,
    executors: registry,
    workerId: input.workerId,
    maxTasks: input.maxTasks,
    maxRuntimeMs: input.maxRuntimeMs,
    objectiveId: input.objectiveId,
    verifyCompletion: (objective) =>
      store.assessObjectiveCompletion(objective.id),
  });
}

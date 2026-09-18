import type { SupabaseClient } from "@supabase/supabase-js";
import { registerArkAgencyToolExecutor } from "./agencyToolExecutor";
import { ArkExecutorRegistry } from "./executorRegistry";
import { runArkWorkerCycle, type ArkWorkerCycleResult } from "./runner";
import { SupabaseArkStore } from "./supabaseStore";

export async function runDefaultArkWorkerCycle(input: {
  supabase: SupabaseClient;
  workerId: string;
  maxTasks?: number;
  maxRuntimeMs?: number;
  objectiveId?: string;
}): Promise<ArkWorkerCycleResult> {
  const registry = new ArkExecutorRegistry();
  registerArkAgencyToolExecutor({
    registry,
    supabase: input.supabase,
  });

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

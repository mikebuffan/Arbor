import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { runDefaultArkWorkerCycle } from "@/lib/ark/defaultWorker";

export async function runPreviewArkAcceptanceCycle(objectiveId: string) {
  return runDefaultArkWorkerCycle({
    supabase: supabaseAdmin(),
    workerId: `preview-acceptance:${crypto.randomUUID()}`,
    objectiveId,
    maxTasks: 1,
    maxRuntimeMs: 20_000,
  });
}

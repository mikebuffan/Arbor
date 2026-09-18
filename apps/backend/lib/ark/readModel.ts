import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingRuntimeTable } from "@/lib/arbor/runtime/missingRuntimeTable";

export type ArkReadSnapshot = {
  available: boolean;
  objectives: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  capturedAt: string;
};

export async function readArkProjectSnapshot(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  objectiveLimit?: number;
}): Promise<ArkReadSnapshot> {
  const capturedAt = new Date().toISOString();
  const { data: objectives, error: objectiveError } = await input.supabase
    .from("ark_objectives")
    .select("id,goal,status,priority,blocker,completion_evidence,version,created_at,updated_at")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .order("updated_at", { ascending: false })
    .limit(input.objectiveLimit ?? 20);

  if (objectiveError) {
    if (isMissingRuntimeTable(objectiveError)) {
      return {
        available: false,
        objectives: [],
        tasks: [],
        capturedAt,
      };
    }
    throw objectiveError;
  }

  const objectiveRows = (objectives ?? []) as Array<Record<string, unknown>>;
  const objectiveIds = objectiveRows
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string");

  if (!objectiveIds.length) {
    return {
      available: true,
      objectives: objectiveRows,
      tasks: [],
      capturedAt,
    };
  }

  const { data: tasks, error: taskError } = await input.supabase
    .from("ark_tasks")
    .select(
      "id,objective_id,task_key,kind,description,status,dependencies,result,attempt_count,max_attempts,available_at,heartbeat_at,checkpoint_sequence,version,created_at,updated_at",
    )
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .in("objective_id", objectiveIds)
    .order("created_at", { ascending: true });

  if (taskError) throw taskError;

  return {
    available: true,
    objectives: objectiveRows,
    tasks: (tasks ?? []) as Array<Record<string, unknown>>,
    capturedAt,
  };
}

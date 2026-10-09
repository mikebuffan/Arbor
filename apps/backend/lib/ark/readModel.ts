import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingRuntimeTable } from "@/lib/arbor/runtime/missingRuntimeTable";

export type ArkReadSnapshot = {
  available: boolean;
  objectives: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  checkpoints: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  capturedAt: string;
};

export async function readArkProjectSnapshot(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  objectiveLimit?: number;
  eventLimit?: number;
}): Promise<ArkReadSnapshot> {
  const capturedAt = new Date().toISOString();
  const { data: objectives, error: objectiveError } = await input.supabase
    .from("ark_objectives")
    .select("id,user_id,project_id,goal,status,priority,blocker,completion_evidence,version,created_at,updated_at")
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
        checkpoints: [],
        events: [],
        capturedAt,
      };
    }
    throw objectiveError;
  }

  // Verify returned-row scope even if a privileged/misconfigured client ignored
  // the query filters. Do not expose owner identifiers to the UI response.
  const ownedObjectives = ((objectives ?? []) as Array<Record<string, unknown>>)
    .filter((row) => row.user_id === input.userId
      && row.project_id === input.projectId
      && typeof row.id === "string");
  const objectiveRows = ownedObjectives.map(({ user_id: _userId, project_id: _projectId, ...row }) => row);
  const objectiveIds = ownedObjectives.map((row) => row.id as string);
  const objectiveIdSet = new Set(objectiveIds);

  if (!objectiveIds.length) {
    return {
      available: true,
      objectives: objectiveRows,
      tasks: [],
      checkpoints: [],
      events: [],
      capturedAt,
    };
  }

  const [
    { data: tasks, error: taskError },
    { data: checkpoints, error: checkpointError },
    { data: events, error: eventError },
  ] = await Promise.all([
    input.supabase
      .from("ark_tasks")
      .select(
        "id,user_id,project_id,objective_id,task_key,kind,description,status,dependencies,result,last_error,attempt_count,max_attempts,available_at,heartbeat_at,checkpoint_sequence,version,created_at,updated_at",
      )
      .eq("user_id", input.userId)
      .eq("project_id", input.projectId)
      .in("objective_id", objectiveIds)
      .order("created_at", { ascending: true }),
    input.supabase
      .from("ark_checkpoints")
      .select("id,objective_id,task_id,sequence,next_action,reason,created_at")
      .in("objective_id", objectiveIds)
      .order("created_at", { ascending: false })
      .limit(100),
    input.supabase
      .from("ark_events")
      .select("id,objective_id,task_id,event_type,created_at")
      .in("objective_id", objectiveIds)
      .order("created_at", { ascending: false })
      .limit(input.eventLimit ?? 100),
  ]);

  if (taskError) throw taskError;
  if (checkpointError) throw checkpointError;
  if (eventError) throw eventError;

  const scopedTasks = ((tasks ?? []) as Array<Record<string, unknown>>)
    .filter((row) => row.user_id === input.userId
      && row.project_id === input.projectId
      && typeof row.id === "string" && row.id.trim().length > 0
      && typeof row.objective_id === "string"
      && objectiveIdSet.has(row.objective_id))
    .map(({ user_id: _userId, project_id: _projectId, ...row }) => row);
  // Checkpoint and event tables have an objective FK but do not carry owner
  // columns in this snapshot projection. Verify task references against the
  // already owner/project-scoped tasks as well as the objective itself.
  // A forged/misrouted row must never attach another task's receipt to
  // an otherwise legitimate objective.
  const taskObjectiveById = new Map(
    scopedTasks.map((row) => [row.id as string, row.objective_id as string]),
  );
  const scopedReceipts = (rows: Array<Record<string, unknown>>) =>
    rows.filter((row) => typeof row.objective_id === "string"
      && objectiveIdSet.has(row.objective_id));
  const receiptReferencesOwnedTask = (row: Record<string, unknown>) =>
    typeof row.task_id === "string"
    && taskObjectiveById.get(row.task_id) === row.objective_id;
  return {
    available: true,
    objectives: objectiveRows,
    tasks: scopedTasks,
    checkpoints: scopedReceipts((checkpoints ?? []) as Array<Record<string, unknown>>)
      .filter(receiptReferencesOwnedTask),
    // Objective-wide events legitimately have no task; task events require
    // an exact current owner/project/objective task match.
    events: scopedReceipts((events ?? []) as Array<Record<string, unknown>>)
      .filter((row) => row.task_id === null || receiptReferencesOwnedTask(row)),
    capturedAt,
  };
}

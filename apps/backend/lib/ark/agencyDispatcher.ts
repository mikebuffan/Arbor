import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueArkAgencyToolPlan } from "./agencyBridge";
import { runDefaultArkWorkerCycle } from "./defaultWorker";

type JsonRow = Record<string, unknown>;

export type ArkAgencyDispatchOutcome =
  | {
      status: "completed";
      objectiveId: string;
      output: unknown;
      attempts: number | null;
      replayed: boolean;
    }
  | {
      status: "checkpointed";
      objectiveId: string;
      taskStatus: "queued" | "running" | "checkpointed";
    }
  | {
      status: "blocked";
      objectiveId: string;
      blocker: Record<string, unknown>;
    }
  | {
      status: "failed";
      objectiveId: string;
      error: string;
    };

function record(value: unknown): JsonRow {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRow
    : {};
}

/**
 * Cross one already-selected Arbor action into ARK and execute only that
 * objective. The caller owns the stable plan/action IDs; ARK owns durable
 * execution after enqueue.
 */
export async function dispatchAgencyToolThroughArk(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId?: string | null;
  turnId: string;
  goal: string;
  planId: string;
  actionId: string;
  capability: string;
  arguments: Record<string, unknown>;
}): Promise<ArkAgencyDispatchOutcome> {
  const objective = await enqueueArkAgencyToolPlan({
    supabase: input.supabase,
    userId: input.userId,
    projectId: input.projectId,
    conversationId: input.conversationId ?? null,
    turnId: input.turnId,
    goal: input.goal,
    planId: input.planId,
    steps: [{
      id: input.actionId,
      description: `Execute ${input.capability}`,
      capability: input.capability,
      arguments: input.arguments,
    }],
  });

  await runDefaultArkWorkerCycle({
    supabase: input.supabase,
    workerId: `chat:${input.turnId}:${input.actionId}`,
    objectiveId: objective.id,
    maxTasks: 1,
    maxRuntimeMs: 20_000,
  });

  const { data, error } = await input.supabase
    .from("ark_tasks")
    .select("status,result,last_error,attempt_count")
    .eq("objective_id", objective.id)
    .eq("task_key", input.actionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return {
      status: "failed",
      objectiveId: objective.id,
      error: "ark_task_missing_after_dispatch",
    };
  }

  const task = data as JsonRow;
  const status = String(task.status ?? "");
  const result = record(task.result);

  if (status === "completed") {
    return {
      status: "completed",
      objectiveId: objective.id,
      output: result.output ?? null,
      attempts:
        typeof result.attempts === "number"
          ? result.attempts
          : typeof task.attempt_count === "number"
            ? task.attempt_count
            : null,
      replayed: result.replayed === true,
    };
  }

  if (status === "blocked") {
    return {
      status: "blocked",
      objectiveId: objective.id,
      blocker: record(result.blocker),
    };
  }

  if (status === "failed") {
    return {
      status: "failed",
      objectiveId: objective.id,
      error:
        typeof task.last_error === "string"
          ? task.last_error
          : "ark_task_failed",
    };
  }

  return {
    status: "checkpointed",
    objectiveId: objective.id,
    taskStatus:
      status === "running" || status === "checkpointed"
        ? status
        : "queued",
  };
}

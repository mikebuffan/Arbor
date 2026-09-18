import type { SupabaseClient } from "@supabase/supabase-js";
import { validateArkTaskGraph } from "./stateMachine";
import type { ArkStore, ArkTaskCompletion } from "./store";
import type {
  ArkCheckpoint,
  ArkClaim,
  ArkObjective,
  ArkObjectiveDraft,
  ArkTask,
  ArkVerification,
} from "./types";

type JsonRow = Record<string, unknown>;

function requiredString(row: JsonRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || !value) {
    throw new Error(`ark_invalid_row:${key}`);
  }
  return value;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function objectiveFromRow(row: JsonRow): ArkObjective {
  const budget = (row.budget ?? {}) as JsonRow;
  return {
    id: requiredString(row, "id"),
    userId: requiredString(row, "user_id"),
    projectId: requiredString(row, "project_id"),
    goal: requiredString(row, "goal"),
    status: requiredString(row, "status") as ArkObjective["status"],
    priority: Number(row.priority ?? 0),
    budget: {
      maxTasksPerCycle: Number(budget.maxTasksPerCycle ?? 8),
      maxRuntimeMs: Number(budget.maxRuntimeMs ?? 25_000),
      maxAttemptsPerTask: Number(budget.maxAttemptsPerTask ?? 3),
    },
    blocker: (row.blocker as Record<string, unknown> | null) ?? null,
    completionEvidence: row.completion_evidence ?? null,
    version: Number(row.version ?? 0),
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  };
}

function taskFromRow(row: JsonRow): ArkTask {
  return {
    id: requiredString(row, "id"),
    objectiveId: requiredString(row, "objective_id"),
    userId: requiredString(row, "user_id"),
    projectId: requiredString(row, "project_id"),
    taskKey: requiredString(row, "task_key"),
    kind: requiredString(row, "kind"),
    description: requiredString(row, "description"),
    status: requiredString(row, "status") as ArkTask["status"],
    dependencies: strings(row.dependencies),
    payload: (row.payload as Record<string, unknown> | null) ?? {},
    result: row.result ?? null,
    attemptCount: Number(row.attempt_count ?? 0),
    maxAttempts: Number(row.max_attempts ?? 3),
    idempotencyKey: requiredString(row, "idempotency_key"),
    availableAt: requiredString(row, "available_at"),
    leaseOwner: (row.lease_owner as string | null) ?? null,
    leaseToken: (row.lease_token as string | null) ?? null,
    leaseExpiresAt: (row.lease_expires_at as string | null) ?? null,
    heartbeatAt: (row.heartbeat_at as string | null) ?? null,
    checkpointSequence: Number(row.checkpoint_sequence ?? 0),
    version: Number(row.version ?? 0),
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  };
}

function object(value: unknown): JsonRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ark_invalid_rpc_response");
  }
  return value as JsonRow;
}

function completionFromRpc(value: unknown): ArkTaskCompletion {
  const row = object(value);
  return {
    objective: objectiveFromRow(object(row.objective)),
    task: taskFromRow(object(row.task)),
  };
}

export class SupabaseArkStore implements ArkStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async enqueueObjective(draft: ArkObjectiveDraft): Promise<ArkObjective> {
    validateArkTaskGraph(draft.tasks);
    const { data, error } = await this.supabase.rpc("ark_enqueue_objective", {
      p_user_id: draft.userId,
      p_project_id: draft.projectId,
      p_goal: draft.goal,
      p_priority: draft.priority ?? 0,
      p_budget: draft.budget ?? {},
      p_idempotency_key: draft.idempotencyKey,
      p_tasks: draft.tasks.map((task) => ({
        task_key: task.taskKey,
        kind: task.kind,
        description: task.description,
        dependencies: task.dependencies ?? [],
        payload: task.payload ?? {},
        max_attempts: task.maxAttempts,
        idempotency_key: task.idempotencyKey,
      })),
    });
    if (error) throw error;
    return objectiveFromRow(object(data));
  }

  async claimNextTask(input: {
    workerId: string;
    leaseMs: number;
    now: string;
    excludedObjectiveIds?: string[];
    onlyObjectiveId?: string;
  }): Promise<ArkClaim | null> {
    const { data, error } = await this.supabase.rpc("ark_claim_next_task", {
      p_worker_id: input.workerId,
      p_lease_ms: input.leaseMs,
      p_now: input.now,
      p_excluded_objective_ids: input.excludedObjectiveIds ?? [],
      p_only_objective_id: input.onlyObjectiveId ?? null,
    });
    if (error) throw error;
    if (!data) return null;
    const row = object(data);
    return {
      objective: objectiveFromRow(object(row.objective)),
      task: taskFromRow(object(row.task)),
    };
  }

  async nextObjectiveAwaitingVerification(objectiveId?: string): Promise<ArkObjective | null> {
    let query = this.supabase
      .from("ark_objectives")
      .select("*")
      .eq("status", "awaiting_verification")
      .order("updated_at", { ascending: true })
      .limit(1);
    if (objectiveId) {
      query = query.eq("id", objectiveId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? objectiveFromRow(object(data)) : null;
  }

  async heartbeat(input: {
    taskId: string;
    workerId: string;
    leaseToken: string;
    leaseMs: number;
    now: string;
  }): Promise<boolean> {
    const { data, error } = await this.supabase.rpc("ark_heartbeat_task", {
      p_task_id: input.taskId,
      p_worker_id: input.workerId,
      p_lease_token: input.leaseToken,
      p_lease_ms: input.leaseMs,
      p_now: input.now,
    });
    if (error) throw error;
    return data === true;
  }

  async checkpoint(input: {
    claim: ArkClaim;
    checkpoint: ArkCheckpoint;
    now: string;
  }): Promise<ArkTask> {
    const { data, error } = await this.supabase.rpc("ark_checkpoint_task", {
      p_task_id: input.claim.task.id,
      p_worker_id: input.claim.task.leaseOwner,
      p_lease_token: input.claim.task.leaseToken,
      p_sequence: input.checkpoint.sequence,
      p_state: input.checkpoint.state,
      p_next_action: input.checkpoint.nextAction,
      p_reason: input.checkpoint.reason,
      p_resume_after: input.checkpoint.resumeAfter ?? input.now,
      p_now: input.now,
    });
    if (error) throw error;
    return taskFromRow(object(data));
  }

  async completeTask(input: {
    claim: ArkClaim;
    result: unknown;
    now: string;
  }): Promise<ArkTaskCompletion> {
    const { data, error } = await this.supabase.rpc("ark_complete_task", {
      p_task_id: input.claim.task.id,
      p_worker_id: input.claim.task.leaseOwner,
      p_lease_token: input.claim.task.leaseToken,
      p_result: input.result ?? null,
      p_now: input.now,
    });
    if (error) throw error;
    return completionFromRpc(data);
  }

  async blockTask(input: {
    claim: ArkClaim;
    blocker: Record<string, unknown>;
    now: string;
  }): Promise<ArkTaskCompletion> {
    const { data, error } = await this.supabase.rpc("ark_block_task", {
      p_task_id: input.claim.task.id,
      p_worker_id: input.claim.task.leaseOwner,
      p_lease_token: input.claim.task.leaseToken,
      p_blocker: input.blocker,
      p_now: input.now,
    });
    if (error) throw error;
    return completionFromRpc(data);
  }

  async failTask(input: {
    claim: ArkClaim;
    error: string;
    retryAt: string | null;
    now: string;
  }): Promise<ArkTaskCompletion> {
    const { data, error } = await this.supabase.rpc("ark_fail_task", {
      p_task_id: input.claim.task.id,
      p_worker_id: input.claim.task.leaseOwner,
      p_lease_token: input.claim.task.leaseToken,
      p_error: input.error,
      p_retry_at: input.retryAt,
      p_now: input.now,
    });
    if (error) throw error;
    return completionFromRpc(data);
  }

  async verifyObjective(input: {
    objectiveId: string;
    verification: ArkVerification;
    now: string;
  }): Promise<ArkObjective> {
    const { data, error } = await this.supabase.rpc("ark_verify_objective", {
      p_objective_id: input.objectiveId,
      p_ok: input.verification.ok,
      p_evidence: input.verification.evidence ?? null,
      p_unresolved_work: input.verification.unresolvedWork ?? [],
      p_now: input.now,
    });
    if (error) throw error;
    return objectiveFromRow(object(data));
  }

  async assessObjectiveCompletion(objectiveId: string): Promise<ArkVerification> {
    const { data, error } = await this.supabase
      .from("ark_tasks")
      .select("task_key,status,result")
      .eq("objective_id", objectiveId)
      .order("task_key", { ascending: true });
    if (error) throw error;

    const tasks = data ?? [];
    const unresolvedWork: string[] = [];
    const evidence = tasks.map((task) => {
      const result = task.result && typeof task.result === "object" && !Array.isArray(task.result)
        ? task.result as JsonRow
        : {};
      const verified = result.verified === true;
      if (task.status !== "completed" || !verified) {
        unresolvedWork.push(String(task.task_key));
      }
      return {
        taskKey: String(task.task_key),
        status: String(task.status),
        verified,
        capability:
          typeof result.capability === "string" ? result.capability : null,
        attempts:
          typeof result.attempts === "number" ? result.attempts : null,
      };
    });

    return {
      ok: tasks.length > 0 && unresolvedWork.length === 0,
      evidence: {
        gate: "all_tasks_completed_with_executor_verification",
        tasks: evidence,
      },
      unresolvedWork,
    };
  }
}

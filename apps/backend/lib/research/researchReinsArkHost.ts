import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildPromptContext } from "@/lib/prompt/buildPromptContext";
import { ArkExecutorRegistry } from "@/lib/ark/executorRegistry";
import { runArkWorkerCycle, type ArkWorkerCycleResult } from "@/lib/ark/runner";
import { SupabaseArkStore } from "@/lib/ark/supabaseStore";
import type { ArkClaim } from "@/lib/ark/types";
import { SupabaseResearchStore } from "./supabaseResearchStore";
import { buildDefaultResearchUnitDispatcher } from "./researchUnitDispatcher";
import { buildArborResearchControllerPlanner } from "./arborResearchControllerPlanner";
import {
  ARK_RESEARCH_CONTROLLER_TASK_KIND,
  registerArkResearchControllerExecutor,
} from "./registerArkResearchControllerExecutor";

export type ResearchReinsBinding = {
  runId: string;
  runStatus: "active" | "stopped" | "completed";
  userId: string;
  projectId: string;
  sessionId: string;
  objectiveId: string;
  taskId: string;
  goal: string;
  taskStatus:
    | "queued"
    | "running"
    | "checkpointed"
    | "blocked"
    | "completed"
    | "failed"
    | "cancelled";
  taskAttemptCount: number;
  taskMaxAttempts: number;
  taskAvailableAt: string;
  objectiveStatus:
    | "queued"
    | "running"
    | "checkpointed"
    | "blocked"
    | "awaiting_verification"
    | "completed"
    | "failed"
    | "cancelled";
  sourceScope: "project_history";
  authorizationVersion: string;
  sessionAuthorized: boolean;
  cancellationRequested: boolean;
  startedAt: string;
  deadlineAt: string;
  maxWorkUnits: number;
  consumedWorkUnits: number;
  maxCostCents: number;
  committedCostCents: number;
};

export type ResearchReinsArkPulseResult = {
  action: "resume" | "stop";
  reason: string;
  delaySeconds?: number;
  worker: ArkWorkerCycleResult | null;
  binding: ResearchReinsBinding | null;
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("research_reins_invalid_binding_response");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, key: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("research_reins_invalid_binding_" + key);
  }
  return value.trim();
}

function integer(value: unknown, key: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error("research_reins_invalid_binding_" + key);
  }
  return value;
}

function bool(value: unknown, key: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error("research_reins_invalid_binding_" + key);
  }
  return value;
}

function iso(value: unknown, key: string): string {
  const raw = text(value, key);
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error("research_reins_invalid_binding_" + key);
  }
  return raw;
}

function oneOf<T extends string>(
  value: unknown,
  key: string,
  allowed: readonly T[],
): T {
  const raw = text(value, key);
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new Error("research_reins_invalid_binding_" + key);
  }
  return raw as T;
}

const runStatuses = ["active", "stopped", "completed"] as const;
const taskStatuses = [
  "queued",
  "running",
  "checkpointed",
  "blocked",
  "completed",
  "failed",
  "cancelled",
] as const;
const objectiveStatuses = [
  "queued",
  "running",
  "checkpointed",
  "blocked",
  "awaiting_verification",
  "completed",
  "failed",
  "cancelled",
] as const;

export async function loadResearchReinsBinding(input: {
  supabase: SupabaseClient;
  runId: string;
}): Promise<ResearchReinsBinding | null> {
  const { data, error } = await input.supabase.rpc(
    "arbor_load_research_reins_binding",
    { p_run_id: input.runId },
  );
  if (error) throw error;
  if (data === null) return null;

  const r = object(data);
  const sourceScope = text(r.sourceScope, "source_scope");
  if (sourceScope !== "project_history") {
    throw new Error("research_reins_unsupported_source_scope");
  }

  return {
    runId: text(r.runId, "run_id"),
    runStatus: oneOf(r.runStatus, "run_status", runStatuses),
    userId: text(r.userId, "user_id"),
    projectId: text(r.projectId, "project_id"),
    sessionId: text(r.sessionId, "session_id"),
    objectiveId: text(r.objectiveId, "objective_id"),
    taskId: text(r.taskId, "task_id"),
    goal: text(r.goal, "goal"),
    taskStatus: oneOf(r.taskStatus, "task_status", taskStatuses),
    taskAttemptCount: integer(r.taskAttemptCount, "task_attempt_count"),
    taskMaxAttempts: integer(r.taskMaxAttempts, "task_max_attempts"),
    taskAvailableAt: iso(r.taskAvailableAt, "task_available_at"),
    objectiveStatus: oneOf(
      r.objectiveStatus,
      "objective_status",
      objectiveStatuses,
    ),
    sourceScope,
    authorizationVersion: text(
      r.authorizationVersion,
      "authorization_version",
    ),
    sessionAuthorized: bool(
      r.sessionAuthorized,
      "session_authorized",
    ),
    cancellationRequested: bool(
      r.cancellationRequested,
      "cancellation_requested",
    ),
    startedAt: iso(r.startedAt, "started_at"),
    deadlineAt: iso(r.deadlineAt, "deadline_at"),
    maxWorkUnits: integer(r.maxWorkUnits, "max_work_units"),
    consumedWorkUnits: integer(
      r.consumedWorkUnits,
      "consumed_work_units",
    ),
    maxCostCents: integer(r.maxCostCents, "max_cost_cents"),
    committedCostCents: integer(
      r.committedCostCents,
      "committed_cost_cents",
    ),
  };
}

function preflightStopReason(
  binding: ResearchReinsBinding,
  at: string,
): string | null {
  if (binding.runStatus !== "active") {
    return "research_reins_run_" + binding.runStatus;
  }
  if (!binding.sessionAuthorized) {
    return "research_reins_authorization_revoked";
  }
  if (binding.cancellationRequested) {
    return "research_reins_cancelled";
  }
  if (Date.parse(at) < Date.parse(binding.startedAt)) {
    return "research_reins_not_started";
  }
  if (Date.parse(at) >= Date.parse(binding.deadlineAt)) {
    return "research_reins_deadline_reached";
  }
  if (
    binding.consumedWorkUnits >= binding.maxWorkUnits ||
    binding.committedCostCents >= binding.maxCostCents
  ) {
    return "research_reins_budget_exhausted";
  }
  if (
    (binding.taskStatus === "queued" ||
      binding.taskStatus === "checkpointed") &&
    binding.taskAttemptCount >= binding.taskMaxAttempts
  ) {
    return "research_reins_ark_attempt_budget_exhausted";
  }
  if (
    binding.taskStatus === "blocked" ||
    binding.taskStatus === "completed" ||
    binding.taskStatus === "failed" ||
    binding.taskStatus === "cancelled"
  ) {
    return "research_reins_task_" + binding.taskStatus;
  }
  if (
    binding.objectiveStatus === "blocked" ||
    binding.objectiveStatus === "awaiting_verification" ||
    binding.objectiveStatus === "completed" ||
    binding.objectiveStatus === "failed" ||
    binding.objectiveStatus === "cancelled"
  ) {
    return "research_reins_objective_" + binding.objectiveStatus;
  }
  return null;
}

async function buildControllerBinding(input: {
  supabase: SupabaseClient;
  run: ResearchReinsBinding;
  claim: ArkClaim;
}) {
  if (
    input.claim.objective.id !== input.run.objectiveId ||
    input.claim.task.id !== input.run.taskId ||
    input.claim.task.kind !== ARK_RESEARCH_CONTROLLER_TASK_KIND ||
    input.claim.task.userId !== input.run.userId ||
    input.claim.task.projectId !== input.run.projectId
  ) {
    return null;
  }

  const dispatcher = buildDefaultResearchUnitDispatcher({
    supabase: input.supabase,
  });
  const store = new SupabaseResearchStore(
    input.supabase,
    input.run.userId,
    input.run.projectId,
    "reins-research:" + input.run.runId,
  );

  const prompt = await buildPromptContext({
    supabase: input.supabase,
    authedUserId: input.run.userId,
    projectId: input.run.projectId,
    conversationId: null,
    latestUserText:
      "Continue the authorized bounded background research goal: " +
      input.run.goal,
    interactionMode: "text",
    hostSessionId: "research-reins:" + input.run.runId,
    currentGoal: input.run.goal,
  });

  const planner = buildArborResearchControllerPlanner({
    instructions: prompt.systemPrompt,
    context: {
      userId: input.run.userId,
      projectId: input.run.projectId,
      conversationId: null,
      turnId:
        "research-reins:" +
        input.run.runId +
        ":checkpoint-" +
        String(input.claim.task.checkpointSequence + 1),
    },
    behaviorRequirements: prompt.behaviorGuardRequirements,
    allowedUnitKinds: dispatcher.kinds(),
  });

  return {
    handoff: {
      ownerId: input.run.userId,
      projectId: input.run.projectId,
      sessionId: input.run.sessionId,
      objectiveId: input.run.objectiveId,
      authorizationVersion: input.run.authorizationVersion,
      sourceAccessApproved: input.run.sourceScope === "project_history",
      privacyReviewRequired: true as const,
    },
    store,
    executor: dispatcher.executor(),
    planner,
  };
}

export async function runResearchReinsArkPulse(input: {
  runId: string;
  supabase?: SupabaseClient;
  now?: () => Date;
}): Promise<ResearchReinsArkPulseResult> {
  const supabase = input.supabase ?? supabaseAdmin();
  const now = input.now ?? (() => new Date());
  const at = now().toISOString();

  const before = await loadResearchReinsBinding({
    supabase,
    runId: input.runId,
  });
  if (!before) {
    return {
      action: "stop",
      reason: "research_reins_run_not_found",
      worker: null,
      binding: null,
    };
  }

  const beforeStop = preflightStopReason(before, at);
  if (beforeStop) {
    return {
      action: "stop",
      reason: beforeStop,
      worker: null,
      binding: before,
    };
  }

  const registry = new ArkExecutorRegistry();
  registerArkResearchControllerExecutor({
    registry,
    now,
    resolveTrustedBinding: (claim) =>
      buildControllerBinding({
        supabase,
        run: before,
        claim,
      }),
  });

  const worker = await runArkWorkerCycle({
    store: new SupabaseArkStore(supabase),
    executors: registry,
    workerId: "reins-ark:" + before.runId,
    objectiveId: before.objectiveId,
    leaseMs: 60_000,
    maxTasks: 1,
    maxRuntimeMs: 25_000,
    now,
  });

  const after = await loadResearchReinsBinding({
    supabase,
    runId: before.runId,
  });
  if (!after) {
    return {
      action: "stop",
      reason: "research_reins_binding_lost_after_pulse",
      worker,
      binding: null,
    };
  }

  const afterStop = preflightStopReason(after, now().toISOString());
  if (afterStop) {
    return {
      action: "stop",
      reason: afterStop,
      worker,
      binding: after,
    };
  }

  return {
    action: "resume",
    reason:
      worker.checkpointed > 0
        ? "research_reins_ark_checkpointed"
        : worker.failed > 0
          ? "research_reins_ark_retry_scheduled"
          : worker.status === "idle"
            ? "research_reins_ark_waiting"
            : "research_reins_ark_continue",
    delaySeconds: 30,
    worker,
    binding: after,
  };
}

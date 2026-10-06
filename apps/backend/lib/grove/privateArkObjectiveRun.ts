import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { isArkChatExecutionEnabled } from "@/lib/ark/activation";
import { runDefaultArkWorkerCycle } from "@/lib/ark/defaultWorker";
import { authorizePrivateGroveConversation } from "./privateReadBroker";

const PURPOSE = "bounded_objective_execution";

type BoundConversation = Awaited<
  ReturnType<typeof authorizePrivateGroveConversation>
>;

type Selection = {
  objective: {
    id: string;
    userId: string;
    projectId: string;
    status: string;
    goal: string;
  };
  task: {
    id: string;
    objectiveId: string;
    userId: string;
    projectId: string;
    conversationId: string;
    kind: string;
    status: string;
    result: unknown;
    lastError: string | null;
    attemptCount: number;
  };
};

export type GroveArkRunDeps = {
  authorize?: typeof authorizePrivateGroveArkObjectiveRun;
  readSelection?: (input: {
    supabase: SupabaseClient;
    userId: string;
    projectId: string;
    objectiveId: string;
    conversationId: string;
  }) => Promise<Selection>;
  runWorker?: typeof runDefaultArkWorkerCycle;
};

export function grovePrivateArkExecutionEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.GROVE_PRIVATE_ARK_EXECUTION_ENABLED === "true" &&
    isArkChatExecutionEnabled({
      ARBOR_ARK_ENABLE_LIVE_EXECUTION: env.ARBOR_ARK_ENABLE_LIVE_EXECUTION,
      ARBOR_ENABLE_ARK_EXECUTION: env.ARBOR_ENABLE_ARK_EXECUTION,
      ARBOR_ENABLE_ARK_CHAT_EXECUTION: env.ARBOR_ENABLE_ARK_CHAT_EXECUTION,
    });
}

export async function authorizePrivateGroveArkObjectiveRun(
  req: Request,
  projectId: string,
  conversationId: string,
  objectiveId: string,
): Promise<BoundConversation> {
  if (!grovePrivateArkExecutionEnabled()) {
    throw new RouteAccessError(404, "grove_ark_execution_not_enabled");
  }

  const bound = await authorizePrivateGroveConversation(
    req,
    projectId,
    conversationId,
  );
  const now = new Date().toISOString();
  const { data, error } = await bound.groveAdmin
    .from("grove_private_ark_objective_run_grants")
    .select(
      "grove_user_id,firefly_user_id,firefly_project_id,firefly_conversation_id,ark_objective_id,purpose,expires_at,revoked_at",
    )
    .eq("grove_user_id", bound.groveUserId)
    .eq("firefly_user_id", bound.fireflyUserId)
    .eq("firefly_project_id", projectId)
    .eq("firefly_conversation_id", conversationId)
    .eq("ark_objective_id", objectiveId)
    .eq("purpose", PURPOSE)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .maybeSingle();

  if (error) {
    throw new RouteAccessError(
      500,
      "grove_ark_execution_permission_unavailable",
    );
  }

  if (
    !data ||
    data.grove_user_id !== bound.groveUserId ||
    data.firefly_user_id !== bound.fireflyUserId ||
    data.firefly_project_id !== projectId ||
    data.firefly_conversation_id !== conversationId ||
    data.ark_objective_id !== objectiveId ||
    data.purpose !== PURPOSE ||
    data.revoked_at !== null ||
    typeof data.expires_at !== "string" ||
    !Number.isFinite(Date.parse(data.expires_at)) ||
    Date.parse(data.expires_at) <= Date.now()
  ) {
    throw new RouteAccessError(403, "grove_ark_execution_not_granted");
  }

  return bound;
}

async function readSingleTaskSelection(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  objectiveId: string;
  conversationId: string;
}): Promise<Selection> {
  const { data: objective, error: objectiveError } = await input.supabase
    .from("ark_objectives")
    .select("id,user_id,project_id,status,goal")
    .eq("id", input.objectiveId)
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .maybeSingle();

  if (objectiveError) throw objectiveError;
  if (
    !objective ||
    objective.id !== input.objectiveId ||
    objective.user_id !== input.userId ||
    objective.project_id !== input.projectId ||
    typeof objective.status !== "string" ||
    typeof objective.goal !== "string"
  ) {
    throw new RouteAccessError(404, "grove_ark_objective_not_found");
  }

  const { data: tasks, error: taskError } = await input.supabase
    .from("ark_tasks")
    .select(
      "id,objective_id,user_id,project_id,kind,status,payload,result,last_error,attempt_count",
    )
    .eq("objective_id", input.objectiveId)
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .limit(2);

  if (taskError) throw taskError;
  if (!Array.isArray(tasks) || tasks.length !== 1) {
    throw new RouteAccessError(
      409,
      "grove_ark_objective_not_single_task",
    );
  }

  const task = tasks[0];
  const payload = task?.payload && typeof task.payload === "object" &&
    !Array.isArray(task.payload)
    ? task.payload as Record<string, unknown>
    : null;
  if (
    !task ||
    typeof task.id !== "string" ||
    task.objective_id !== input.objectiveId ||
    task.user_id !== input.userId ||
    task.project_id !== input.projectId ||
    task.kind !== "arbor.agency-tool" ||
    typeof task.status !== "string" ||
    payload?.conversationId !== input.conversationId
  ) {
    throw new RouteAccessError(409, "grove_ark_task_not_supported");
  }

  return {
    objective: {
      id: objective.id,
      userId: objective.user_id,
      projectId: objective.project_id,
      status: objective.status,
      goal: objective.goal,
    },
    task: {
      id: task.id,
      objectiveId: task.objective_id,
      userId: task.user_id,
      projectId: task.project_id,
      conversationId: payload.conversationId as string,
      kind: task.kind,
      status: task.status,
      result: task.result ?? null,
      lastError: typeof task.last_error === "string"
        ? task.last_error
        : null,
      attemptCount: Number(task.attempt_count ?? 0),
    },
  };
}

function boundedResult(value: unknown): {
  resultJson: string | null;
  resultTruncated: boolean;
} {
  if (value === null || value === undefined) {
    return { resultJson: null, resultTruncated: false };
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    serialized = JSON.stringify({ error: "unserializable_result" });
  }
  if (serialized.length <= 20_000) {
    return { resultJson: serialized, resultTruncated: false };
  }
  return {
    resultJson: serialized.slice(0, 20_000),
    resultTruncated: true,
  };
}

export async function runPrivateGroveArkObjective(input: {
  request: Request;
  projectId: string;
  conversationId: string;
  objectiveId: string;
  requestId: string;
  dependencies?: GroveArkRunDeps;
}) {
  const deps = input.dependencies ?? {};
  const authorize =
    deps.authorize ?? authorizePrivateGroveArkObjectiveRun;
  const readSelection =
    deps.readSelection ?? readSingleTaskSelection;
  const runWorker =
    deps.runWorker ?? runDefaultArkWorkerCycle;

  const bound = await authorize(
    input.request,
    input.projectId,
    input.conversationId,
    input.objectiveId,
  );

  const reauthorize = async () => {
    const current = await authorize(
      input.request,
      input.projectId,
      input.conversationId,
      input.objectiveId,
    );
    if (
      current.groveUserId !== bound.groveUserId ||
      current.fireflyUserId !== bound.fireflyUserId ||
      current.projectId !== bound.projectId ||
      current.conversationId !== bound.conversationId
    ) {
      throw new RouteAccessError(403, "grove_ark_execution_access_changed");
    }
  };

  const scope = {
    supabase: bound.fireflyAdmin,
    userId: bound.fireflyUserId,
    projectId: input.projectId,
    objectiveId: input.objectiveId,
    conversationId: input.conversationId,
  };

  let selected = await readSelection(scope);

  if (selected.task.status === "running") {
    throw new RouteAccessError(409, "grove_ark_task_in_progress");
  }

  const terminal = new Set([
    "completed",
    "blocked",
    "failed",
    "cancelled",
  ]);
  let replayed = terminal.has(selected.task.status);

  if (!replayed) {
    if (!["queued", "checkpointed"].includes(selected.task.status)) {
      throw new RouteAccessError(409, "grove_ark_task_state_not_runnable");
    }

    await reauthorize();
    await runWorker({
      supabase: bound.fireflyAdmin,
      toolSupabase: bound.fireflyAdmin,
      workerId: `grove:${input.requestId}`,
      objectiveId: input.objectiveId,
      maxTasks: 1,
      maxRuntimeMs: 20_000,
    });
    await reauthorize();
    selected = await readSelection(scope);
    await reauthorize();
  } else {
    await reauthorize();
  }

  const bounded = boundedResult(selected.task.result);
  return {
    objectiveId: selected.objective.id,
    taskId: selected.task.id,
    taskStatus: selected.task.status,
    attemptCount: selected.task.attemptCount,
    lastError: selected.task.lastError,
    completed: selected.task.status === "completed",
    replayed,
    ...bounded,
    verifiesObjectiveCompletion: false as const,
  };
}

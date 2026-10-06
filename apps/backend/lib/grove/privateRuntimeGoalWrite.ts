import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { authorizePrivateGroveConversation } from "./privateReadBroker";
import type { ArborRuntimeState } from "@/lib/arbor/runtime/runtimeState";

const PURPOSE = "conversation_runtime_goal";
const MAX_RETRIES = 4;

type BoundConversation = Awaited<
  ReturnType<typeof authorizePrivateGroveConversation>
>;

type RuntimeRow = {
  user_id: string;
  project_id: string;
  conversation_id: string;
  state: ArborRuntimeState;
  updated_at: string;
};

export async function authorizePrivateGroveRuntimeGoalWrite(
  req: Request,
  projectId: string,
  conversationId: string,
): Promise<BoundConversation> {
  if (process.env.GROVE_PRIVATE_RUNTIME_GOAL_WRITE_ENABLED !== "true") {
    throw new RouteAccessError(404, "grove_runtime_goal_write_not_enabled");
  }

  const bound = await authorizePrivateGroveConversation(
    req,
    projectId,
    conversationId,
  );
  const now = new Date().toISOString();
  const { data, error } = await bound.groveAdmin
    .from("grove_private_runtime_goal_write_grants")
    .select(
      "grove_user_id,firefly_user_id,firefly_project_id,firefly_conversation_id,purpose,expires_at,revoked_at",
    )
    .eq("grove_user_id", bound.groveUserId)
    .eq("firefly_user_id", bound.fireflyUserId)
    .eq("firefly_project_id", projectId)
    .eq("firefly_conversation_id", conversationId)
    .eq("purpose", PURPOSE)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .maybeSingle();

  if (error) {
    throw new RouteAccessError(
      500,
      "grove_runtime_goal_permission_unavailable",
    );
  }

  if (
    !data ||
    data.grove_user_id !== bound.groveUserId ||
    data.firefly_user_id !== bound.fireflyUserId ||
    data.firefly_project_id !== projectId ||
    data.firefly_conversation_id !== conversationId ||
    data.purpose !== PURPOSE ||
    data.revoked_at !== null ||
    typeof data.expires_at !== "string" ||
    !Number.isFinite(Date.parse(data.expires_at)) ||
    Date.parse(data.expires_at) <= Date.now()
  ) {
    throw new RouteAccessError(
      403,
      "grove_runtime_goal_write_not_granted",
    );
  }

  return bound;
}

function stateMatchesScope(
  state: ArborRuntimeState | null | undefined,
  scope: {
    userId: string;
    projectId: string;
    conversationId: string;
  },
): state is ArborRuntimeState {
  return Boolean(
    state &&
    state.schemaVersion === 1 &&
    state.userId === scope.userId &&
    state.projectId === scope.projectId &&
    state.conversationId === scope.conversationId,
  );
}

export function withRuntimeGoal(input: {
  prior: ArborRuntimeState | null;
  userId: string;
  projectId: string;
  conversationId: string;
  goal: string | null;
  now: string;
}): ArborRuntimeState {
  if (input.prior && !stateMatchesScope(input.prior, input)) {
    throw new Error("grove_runtime_goal_state_scope_mismatch");
  }

  if (input.prior) {
    return {
      ...input.prior,
      currentGoal: input.goal,
      updatedAt: input.now,
    };
  }

  return {
    schemaVersion: 1,
    userId: input.userId,
    projectId: input.projectId,
    conversationId: input.conversationId,
    channel: "text",
    activeSubsystem: "arbor",
    currentGoal: input.goal,
    lastMeaningfulUserTurn: null,
    lastMeaningfulArborTurn: null,
    agency: null,
    corrections: [],
    behaviorProof: null,
    pendingSelfUpdate: null,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

async function readExact(
  supabase: SupabaseClient,
  scope: { userId: string; projectId: string; conversationId: string },
): Promise<RuntimeRow | null> {
  const { data, error } = await supabase
    .from("arbor_conversation_state")
    .select("user_id,project_id,conversation_id,state,updated_at")
    .eq("user_id", scope.userId)
    .eq("project_id", scope.projectId)
    .eq("conversation_id", scope.conversationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as RuntimeRow;
  if (
    row.user_id !== scope.userId ||
    row.project_id !== scope.projectId ||
    row.conversation_id !== scope.conversationId ||
    !stateMatchesScope(row.state, scope) ||
    typeof row.updated_at !== "string" ||
    !Number.isFinite(Date.parse(row.updated_at))
  ) {
    throw new Error("grove_runtime_goal_state_scope_mismatch");
  }

  return row;
}

async function writeExact(input: {
  supabase: SupabaseClient;
  scope: { userId: string; projectId: string; conversationId: string };
  observed: RuntimeRow | null;
  next: ArborRuntimeState;
}): Promise<boolean> {
  if (!input.observed) {
    const { error } = await input.supabase
      .from("arbor_conversation_state")
      .insert({
        user_id: input.scope.userId,
        project_id: input.scope.projectId,
        conversation_id: input.scope.conversationId,
        state: input.next,
        updated_at: input.next.updatedAt,
      });

    if (!error) return true;
    if ((error as { code?: string }).code === "23505") return false;
    throw error;
  }

  const { data, error } = await input.supabase
    .from("arbor_conversation_state")
    .update({
      state: input.next,
      updated_at: input.next.updatedAt,
    })
    .eq("user_id", input.scope.userId)
    .eq("project_id", input.scope.projectId)
    .eq("conversation_id", input.scope.conversationId)
    .eq("updated_at", input.observed.updated_at)
    .select("user_id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

function normalizedGoal(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > 500) {
    throw new Error("grove_runtime_goal_invalid");
  }
  return normalized;
}

export async function savePrivateGroveRuntimeGoal(input: {
  request: Request;
  projectId: string;
  conversationId: string;
  expectedCurrentGoal: string | null;
  goal: string | null;
}) {
  const expectedCurrentGoal = normalizedGoal(input.expectedCurrentGoal);
  const goal = normalizedGoal(input.goal);
  const bound = await authorizePrivateGroveRuntimeGoalWrite(
    input.request,
    input.projectId,
    input.conversationId,
  );
  const scope = {
    userId: bound.fireflyUserId,
    projectId: input.projectId,
    conversationId: input.conversationId,
  };

  const reauthorize = async () => {
    const current = await authorizePrivateGroveRuntimeGoalWrite(
      input.request,
      input.projectId,
      input.conversationId,
    );
    if (
      current.groveUserId !== bound.groveUserId ||
      current.fireflyUserId !== bound.fireflyUserId ||
      current.projectId !== bound.projectId ||
      current.conversationId !== bound.conversationId
    ) {
      throw new RouteAccessError(403, "grove_runtime_goal_access_changed");
    }
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const observed = await readExact(bound.fireflyAdmin, scope);
    const currentGoal = observed?.state.currentGoal ?? null;

    if (currentGoal === goal) {
      await reauthorize();
      return {
        status: "saved" as const,
        currentGoal: goal,
        replayed: true,
      };
    }

    if (currentGoal !== expectedCurrentGoal) {
      throw new RouteAccessError(409, "grove_runtime_goal_conflict");
    }

    await reauthorize();
    const now = new Date().toISOString();
    const next = withRuntimeGoal({
      prior: observed?.state ?? null,
      ...scope,
      goal,
      now,
    });

    if (!await writeExact({
      supabase: bound.fireflyAdmin,
      scope,
      observed,
      next,
    })) {
      continue;
    }

    await reauthorize();
    const verified = await readExact(bound.fireflyAdmin, scope);
    await reauthorize();
    if (
      verified &&
      verified.state.currentGoal === goal &&
      verified.state.updatedAt === next.updatedAt
    ) {
      return {
        status: "saved" as const,
        currentGoal: goal,
        replayed: false,
      };
    }
    throw new Error("grove_runtime_goal_readback_unconfirmed");
  }

  throw new RouteAccessError(409, "grove_runtime_goal_concurrent_update");
}

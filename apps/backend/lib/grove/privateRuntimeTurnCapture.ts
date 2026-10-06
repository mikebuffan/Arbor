import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import type { ArborRuntimeState } from "@/lib/arbor/runtime/runtimeState";
import { authorizePrivateGroveConversation } from "./privateReadBroker";

const PURPOSE = "conversation_runtime_capture";
const MAX_RETRIES = 4;
const MAX_CAPTURE_CHARS = 3000;
const TRUNCATION_MARKER = " … [runtime capture truncated]";

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

function boundedTurn(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("grove_runtime_capture_empty_turn");
  }
  if (normalized.length <= MAX_CAPTURE_CHARS) return normalized;
  return normalized.slice(
    0,
    MAX_CAPTURE_CHARS - TRUNCATION_MARKER.length,
  ) + TRUNCATION_MARKER;
}

export async function authorizePrivateGroveRuntimeCapture(
  req: Request,
  projectId: string,
  conversationId: string,
): Promise<BoundConversation> {
  if (process.env.GROVE_PRIVATE_RUNTIME_CAPTURE_ENABLED !== "true") {
    throw new RouteAccessError(404, "grove_runtime_capture_not_enabled");
  }

  const bound = await authorizePrivateGroveConversation(
    req,
    projectId,
    conversationId,
  );
  const now = new Date().toISOString();
  const { data, error } = await bound.groveAdmin
    .from("grove_private_runtime_capture_grants")
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
      "grove_runtime_capture_permission_unavailable",
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
    throw new RouteAccessError(403, "grove_runtime_capture_not_granted");
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

export function withCapturedRuntimeTurn(input: {
  prior: ArborRuntimeState | null;
  userId: string;
  projectId: string;
  conversationId: string;
  userText: string;
  arborText: string;
  now: string;
}): ArborRuntimeState {
  const userText = boundedTurn(input.userText);
  const arborText = boundedTurn(input.arborText);

  if (input.prior && !stateMatchesScope(input.prior, input)) {
    throw new Error("grove_runtime_capture_state_scope_mismatch");
  }

  if (input.prior) {
    return {
      ...input.prior,
      channel: "text",
      activeSubsystem: "arbor",
      lastMeaningfulUserTurn: userText,
      lastMeaningfulArborTurn: arborText,
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
    currentGoal: null,
    lastMeaningfulUserTurn: userText,
    lastMeaningfulArborTurn: arborText,
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
  scope: {
    userId: string;
    projectId: string;
    conversationId: string;
  },
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
    throw new Error("grove_runtime_capture_state_scope_mismatch");
  }
  return row;
}

async function writeExact(input: {
  supabase: SupabaseClient;
  scope: {
    userId: string;
    projectId: string;
    conversationId: string;
  };
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

export async function capturePrivateGroveRuntimeTurn(input: {
  request: Request;
  projectId: string;
  conversationId: string;
  userText: string;
  arborText: string;
}) {
  const bound = await authorizePrivateGroveRuntimeCapture(
    input.request,
    input.projectId,
    input.conversationId,
  );
  const scope = {
    userId: bound.fireflyUserId,
    projectId: input.projectId,
    conversationId: input.conversationId,
  };
  const userText = boundedTurn(input.userText);
  const arborText = boundedTurn(input.arborText);

  const reauthorize = async () => {
    const current = await authorizePrivateGroveRuntimeCapture(
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
      throw new RouteAccessError(403, "grove_runtime_capture_access_changed");
    }
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const observed = await readExact(bound.fireflyAdmin, scope);
    if (
      observed?.state.lastMeaningfulUserTurn === userText &&
      observed.state.lastMeaningfulArborTurn === arborText
    ) {
      await reauthorize();
      return { status: "saved" as const, replayed: true };
    }

    await reauthorize();
    const now = new Date().toISOString();
    const next = withCapturedRuntimeTurn({
      prior: observed?.state ?? null,
      ...scope,
      userText,
      arborText,
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
      verified.state.lastMeaningfulUserTurn === userText &&
      verified.state.lastMeaningfulArborTurn === arborText &&
      verified.state.updatedAt === next.updatedAt
    ) {
      return { status: "saved" as const, replayed: false };
    }
    throw new Error("grove_runtime_capture_readback_unconfirmed");
  }

  throw new RouteAccessError(409, "grove_runtime_capture_concurrent_update");
}

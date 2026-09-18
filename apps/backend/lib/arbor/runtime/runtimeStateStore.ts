import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeCorrections, type ArborRuntimeState } from "./runtimeState";
import { isMissingRuntimeTable } from "./missingRuntimeTable";

type RuntimeRow = {
  user_id: string;
  project_id: string;
  conversation_id: string;
  state: ArborRuntimeState;
  updated_at: string;
};

function rowState(
  row: RuntimeRow | null,
): ArborRuntimeState | null {
  return row?.state ?? null;
}

export async function loadRuntimeState(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string;
}): Promise<ArborRuntimeState | null> {
  const { data, error } = await input.supabase
    .from("arbor_conversation_state")
    .select("user_id,project_id,conversation_id,state,updated_at")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .eq("conversation_id", input.conversationId)
    .maybeSingle();

  if (error) {
    if (isMissingRuntimeTable(error)) return null;
    throw error;
  }

  const exact = rowState(
    (data as RuntimeRow | null) ?? null,
  );

  if (!exact) {
    return loadProjectRuntimeState(input) ?? loadLatestRuntimeState(input);
  }

  if (meaningfulRuntimeState(exact)) {
    return exact;
  }

  const fallback =
    (await loadProjectRuntimeState(input)) ??
    (await loadLatestRuntimeState({
      supabase: input.supabase,
      userId: input.userId,
      projectId: input.projectId,
      excludeConversationId: exact.conversationId,
    }));

  if (!fallback || fallback.conversationId === exact.conversationId) {
    return exact;
  }

  return mergeRuntimeFallback(fallback, exact);
}

export async function loadProjectRuntimeState(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
}): Promise<ArborRuntimeState | null> {
  const { data, error } = await input.supabase
    .from("arbor_runtime_state")
    .select("user_id,project_id,conversation_id,state,updated_at")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingRuntimeTable(error)) return null;
    throw error;
  }
  return rowState((data as RuntimeRow | null) ?? null);
}

export async function loadLatestRuntimeState(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  excludeConversationId?: string;
}): Promise<ArborRuntimeState | null> {
  let query = input.supabase
    .from("arbor_conversation_state")
    .select("user_id,project_id,conversation_id,state,updated_at")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId);

  if (input.excludeConversationId) {
    query = query.neq(
      "conversation_id",
      input.excludeConversationId,
    );
  }

  const { data, error } = await query
    .order("updated_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingRuntimeTable(error)) return null;
    throw error;
  }

  return rowState(
    (data as RuntimeRow | null) ?? null,
  );
}

export async function saveRuntimeState(input: {
  supabase: SupabaseClient;
  state: ArborRuntimeState;
}): Promise<void> {
  const state = input.state;

  const { error } = await input.supabase
    .from("arbor_conversation_state")
    .upsert(
      {
        user_id: state.userId,
        project_id: state.projectId,
        conversation_id: state.conversationId,
        state,
        updated_at: state.updatedAt,
      },
      {
        onConflict: "user_id,project_id,conversation_id",
      },
    );

  if (error) {
    if (isMissingRuntimeTable(error)) return;
    throw error;
  }

  // Keep the project-level carrier current as the durable cross-thread fallback.
  // Conversation state remains local; project state prevents a blank/new thread
  // from erasing the active objective and agency checkpoint.
  const { error: projectError } = await input.supabase
    .from("arbor_runtime_state")
    .upsert(
      {
        user_id: state.userId,
        project_id: state.projectId,
        conversation_id: state.conversationId,
        state,
        updated_at: state.updatedAt,
      },
      { onConflict: "user_id,project_id,conversation_id" },
    );

  if (projectError && !isMissingRuntimeTable(projectError)) {
    throw projectError;
  }
}


function meaningfulRuntimeState(state: ArborRuntimeState | null): boolean {
  if (!state) return false;

  return Boolean(
    state.currentGoal?.trim() ||
    state.lastMeaningfulUserTurn?.trim() ||
    state.lastMeaningfulArborTurn?.trim() ||
    state.agency?.goal?.trim() ||
    state.agency?.unresolvedWork?.length ||
    state.corrections?.length ||
    state.pendingSelfUpdate
  );
}

function mergeRuntimeFallback(
  fallback: ArborRuntimeState,
  exact: ArborRuntimeState,
): ArborRuntimeState {
  return {
    ...fallback,
    ...exact,
    currentGoal:
      exact.currentGoal?.trim()
        ? exact.currentGoal
        : fallback.currentGoal,
    lastMeaningfulUserTurn:
      exact.lastMeaningfulUserTurn?.trim()
        ? exact.lastMeaningfulUserTurn
        : fallback.lastMeaningfulUserTurn,
    lastMeaningfulArborTurn:
      exact.lastMeaningfulArborTurn?.trim()
        ? exact.lastMeaningfulArborTurn
        : fallback.lastMeaningfulArborTurn,
    agency:
      exact.agency &&
      (
        exact.agency.goal?.trim() ||
        exact.agency.unresolvedWork?.length ||
        exact.agency.status === "blocked"
      )
        ? exact.agency
        : fallback.agency,
    corrections: mergeCorrections(
      fallback.corrections ?? [],
      exact.corrections ?? [],
    ),
    behaviorProof:
      exact.behaviorProof ??
      fallback.behaviorProof,
    pendingSelfUpdate:
      exact.pendingSelfUpdate ??
      fallback.pendingSelfUpdate,
    // The current conversation/surface remain local even when continuity
    // falls back to another thread's meaningful state.
    conversationId: exact.conversationId,
    channel: exact.channel,
    activeSubsystem: exact.activeSubsystem,
    createdAt: exact.createdAt || fallback.createdAt,
    updatedAt:
      exact.updatedAt >= fallback.updatedAt
        ? exact.updatedAt
        : fallback.updatedAt,
  };
}

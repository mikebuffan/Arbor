import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAgencyState } from "../agency/state";
import { loadSubsystemState } from "../subsystem/state";
import {
  buildContinuityState,
  type ArborContinuityState,
} from "./state";

type MessageRow = {
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  user_id: string;
  project_id: string;
  conversation_id: string;
  deleted_at: string | null;
  expires_at: string | null;
};

const BARE = new Set([
  "right",
  "yeah",
  "yep",
  "okay",
  "ok",
  "exactly",
  "mm-hmm",
  "mhm",
]);

function meaningful(content: string): boolean {
  const normalized = content
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, "");

  return Boolean(normalized) && !BARE.has(normalized);
}

function lastMeaningful(
  rows: MessageRow[],
  role: "user" | "assistant",
): string | null {
  for (const row of rows) {
    if (
      row?.role === role &&
      meaningful(row.content)
    ) {
      return row.content.trim();
    }
  }

  return null;
}

async function recentMessages(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string;
  projectWide: boolean;
}): Promise<MessageRow[]> {
  const now = new Date().toISOString();

  let query = input.supabase
    .from("messages")
    .select("role,content,created_at,user_id,project_id,conversation_id,deleted_at,expires_at")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .is("deleted_at", null)
    .or(
      `expires_at.is.null,expires_at.gt.${now}`,
    );

  if (!input.projectWide) {
    query = query.eq(
      "conversation_id",
      input.conversationId,
    );
  }

  const result = await query
    .order("created_at", {
      ascending: false,
    })
    .limit(50);

  if (result.error) {
    throw result.error;
  }

  // This boundary often uses a caller-scoped client, but query filters alone
  // are not proof that all returned records have the authorized scope.
  // Never promote a foreign, deleted or expired provider row into continuity.
  if (!Array.isArray(result.data)) return [];
  return result.data.filter((row: unknown): row is MessageRow => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return false;
    const item = row as Partial<MessageRow>;
    if (item.user_id !== input.userId ||
        item.project_id !== input.projectId ||
        typeof item.conversation_id !== "string" ||
        (!input.projectWide && item.conversation_id !== input.conversationId) ||
        (item.role !== "user" && item.role !== "assistant") ||
        typeof item.content !== "string" ||
        item.deleted_at !== null) return false;
    if (item.expires_at !== null) {
      if (typeof item.expires_at !== "string") return false;
      const expires = Date.parse(item.expires_at);
      if (!Number.isFinite(expires) || expires <= Date.parse(now)) return false;
    }
    return true;
  });
}

export async function loadContinuityState(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string;
  channel: "text" | "voice";
  activeCorrections?: string[];
}): Promise<ArborContinuityState> {
  const [
    agency,
    subsystem,
    conversationRows,
  ] = await Promise.all([
    loadAgencyState(input),
    loadSubsystemState(input),
    recentMessages({
      ...input,
      projectWide: false,
    }),
  ]);

  const conversationUser =
    lastMeaningful(
      conversationRows,
      "user",
    );

  const conversationArbor =
    lastMeaningful(
      conversationRows,
      "assistant",
    );

  const needsProjectFallback =
    !conversationUser ||
    !conversationArbor;

  const projectRows =
    needsProjectFallback
      ? await recentMessages({
          ...input,
          projectWide: true,
        })
      : [];

  return buildContinuityState({
    agency,
    activeSubsystem:
      subsystem.activeSubsystem,
    channel: input.channel,
    lastMeaningfulUserTurn:
      conversationUser ??
      lastMeaningful(
        projectRows,
        "user",
      ),
    lastMeaningfulArborTurn:
      conversationArbor ??
      lastMeaningful(
        projectRows,
        "assistant",
      ),
    activeCorrections:
      input.activeCorrections ?? [],
  });
}

export async function loadContinuityStateSafe(
  input: Parameters<
    typeof loadContinuityState
  >[0],
): Promise<ArborContinuityState> {
  try {
    return await loadContinuityState(input);
  } catch (error) {
    console.warn(
      "[arbor:continuity] fallback",
      error,
    );

    return buildContinuityState({
      activeSubsystem: "arbor",
      channel: input.channel,
      activeCorrections:
        input.activeCorrections,
    });
  }
}

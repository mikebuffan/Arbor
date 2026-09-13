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
    .select("role,content,created_at")
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

  return (
    (result.data ?? []) as MessageRow[]
  );
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

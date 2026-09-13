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
  conversation_id?: string | null;
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
  "hi",
  "hey",
  "hello",
  "good morning",
  "good afternoon",
  "good evening",
  "good night",
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
  for (
    let index = rows.length - 1;
    index >= 0;
    index -= 1
  ) {
    const row = rows[index];

    if (
      row?.role === role &&
      meaningful(row.content)
    ) {
      return row.content.trim();
    }
  }

  return null;
}

async function loadPreviousSession(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string;
  now: string;
}) {
  try {
    const { data, error } = await input.supabase
      .from("messages")
      .select("role,content,conversation_id,created_at")
      .eq("user_id", input.userId)
      .eq("project_id", input.projectId)
      .neq("conversation_id", input.conversationId)
      .is("deleted_at", null)
      .or(`expires_at.is.null,expires_at.gt.${input.now}`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const newestFirst = (data ?? []) as MessageRow[];
    const seed = newestFirst.find(
      (row) =>
        (row.role === "user" || row.role === "assistant") &&
        meaningful(row.content) &&
        Boolean(row.conversation_id),
    );
    const previousSessionConversationId = seed?.conversation_id ?? null;

    if (!previousSessionConversationId) {
      return {
        previousSessionConversationId: null,
        previousSessionUserTurn: null,
        previousSessionArborTurn: null,
      };
    }

    const previousSessionRows = newestFirst
      .filter(
        (row) => row.conversation_id === previousSessionConversationId,
      )
      .reverse();

    return {
      previousSessionConversationId,
      previousSessionUserTurn: lastMeaningful(previousSessionRows, "user"),
      previousSessionArborTurn: lastMeaningful(
        previousSessionRows,
        "assistant",
      ),
    };
  } catch {
    // Prior-session context is additive. A failure here must not erase the
    // current conversation's continuity state.
    console.warn("[arbor:continuity] prior session fallback", {
      subsystem: "continuity",
      operation: "load_previous_session",
      code: "previous_session_load_failed",
      resourceType: "messages",
    });

    return {
      previousSessionConversationId: null,
      previousSessionUserTurn: null,
      previousSessionArborTurn: null,
    };
  }
}

export async function loadContinuityState(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string;
  channel: "text" | "voice";
  activeCorrections?: string[];
}): Promise<ArborContinuityState> {
  const now = new Date().toISOString();

  const [agency, subsystem, messagesResult, previousSession] =
    await Promise.all([
      loadAgencyState(input),
      loadSubsystemState(input),
      input.supabase
        .from("messages")
        .select("role,content")
        .eq("user_id", input.userId)
        .eq(
          "conversation_id",
          input.conversationId,
        )
        .is("deleted_at", null)
        .or(
          `expires_at.is.null,expires_at.gt.${now}`,
        )
        .order("created_at", {
          ascending: true,
        })
        .limit(50),
      loadPreviousSession({
        supabase: input.supabase,
        userId: input.userId,
        projectId: input.projectId,
        conversationId: input.conversationId,
        now,
      }),
    ]);

  if (messagesResult.error) {
    throw messagesResult.error;
  }

  const rows =
    (messagesResult.data ?? []) as MessageRow[];

  return buildContinuityState({
    agency,
    activeSubsystem:
      subsystem.activeSubsystem,
    channel: input.channel,
    lastMeaningfulUserTurn:
      lastMeaningful(rows, "user"),
    lastMeaningfulArborTurn:
      lastMeaningful(rows, "assistant"),
    previousSessionUserTurn:
      previousSession.previousSessionUserTurn,
    previousSessionArborTurn:
      previousSession.previousSessionArborTurn,
    previousSessionConversationId:
      previousSession.previousSessionConversationId,
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
  } catch {
    console.warn("[arbor:continuity] fallback", {
      subsystem: "continuity",
      operation: "load_state",
      code: "continuity_load_failed",
      resourceType: "conversation_state",
    });

    return buildContinuityState({
      activeSubsystem: "arbor",
      channel: input.channel,
      activeCorrections:
        input.activeCorrections,
    });
  }
}

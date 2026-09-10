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
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    if (row?.role === role && meaningful(row.content)) {
      return row.content.trim();
    }
  }
  return null;
}

export async function loadContinuityState(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string;
  channel: "text" | "voice";
  activeCorrections?: string[];
}): Promise<ArborContinuityState> {
  const [agency, subsystem, messagesResult] = await Promise.all([
    loadAgencyState(input),
    loadSubsystemState(input),
    input.supabase
      .from("messages")
      .select("role,content")
      .eq("user_id", input.userId)
      .eq("conversation_id", input.conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(50),
  ]);

  if (messagesResult.error) throw messagesResult.error;

  const rows = (messagesResult.data ?? []) as MessageRow[];

  return buildContinuityState({
    agency,
    activeSubsystem: subsystem.activeSubsystem,
    channel: input.channel,
    lastMeaningfulUserTurn: lastMeaningful(rows, "user"),
    lastMeaningfulArborTurn: lastMeaningful(rows, "assistant"),
    activeCorrections:
      input.activeCorrections ?? [],
  });
}

export async function loadContinuityStateSafe(
  input: Parameters<typeof loadContinuityState>[0],
): Promise<ArborContinuityState> {
  try {
    return await loadContinuityState(input);
  } catch (error) {
    console.warn("[arbor:continuity] fallback", error);

    return buildContinuityState({
      activeSubsystem: "arbor",
      channel: input.channel,
      activeCorrections: input.activeCorrections,
    });
  }
}

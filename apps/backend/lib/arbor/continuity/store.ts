import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArborInteractionMode } from "../behavior/behaviorProjection";
import { listActiveWork } from "../agency/store";
import {
  buildContinuityState,
  type ArborContinuityState,
} from "./state";

type MessageRow = {
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

function meaningful(content: string): boolean {
  const text = content.trim();
  if (!text) return false;

  const bareAcknowledgments = new Set([
    "right",
    "yeah",
    "yep",
    "okay",
    "ok",
    "exactly",
    "mm-hmm",
    "mhm",
  ]);

  return !bareAcknowledgments.has(
    text.toLowerCase().replace(/[.!?]+$/g, "").trim(),
  );
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

export async function loadContinuityState(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string;
  mode: ArborInteractionMode;
  currentGoal?: string | null;
  activeCorrections?: string[];
}): Promise<ArborContinuityState> {
  const [messagesResult, workItems] = await Promise.all([
    params.supabase
      .from("messages")
      .select("role,content,created_at")
      .eq("user_id", params.userId)
      .eq("conversation_id", params.conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(50),

    listActiveWork({
      supabase: params.supabase,
      userId: params.userId,
      projectId: params.projectId,
    }),
  ]);

  if (messagesResult.error) throw messagesResult.error;

  const rows = (messagesResult.data ?? []) as MessageRow[];

  return buildContinuityState({
    mode: params.mode,
    currentGoal: params.currentGoal,
    lastMeaningfulUserTurn: lastMeaningful(rows, "user"),
    lastMeaningfulArborTurn: lastMeaningful(rows, "assistant"),
    workItems,
    activeCorrections: params.activeCorrections,
  });
}


export async function loadContinuityStateSafe(
  params: Parameters<typeof loadContinuityState>[0],
): Promise<ArborContinuityState> {
  try {
    return await loadContinuityState(params);
  } catch (error) {
    console.warn(
      "[arbor:continuity] falling back to minimal continuity state",
      error,
    );

    return buildContinuityState({
      mode: params.mode,
      currentGoal: params.currentGoal,
      activeCorrections: params.activeCorrections,
    });
  }
}

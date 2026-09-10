import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveChatTurnIds } from "@/lib/chat/turnIdentity";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

export type CanonicalAssistantRow = {
  user_id: string;
  project_id: string;
  conversation_id: string;
  role: string;
  content: unknown;
};

export type CanonicalAssistantTurn = {
  text: string;
  conversationId: string;
};

export function validateCanonicalAssistantTurn(input: {
  row: CanonicalAssistantRow | null;
  userId: string;
  projectId: string;
}): CanonicalAssistantTurn {
  const { row } = input;

  if (!row) {
    throw new RouteAccessError(
      404,
      "assistant_turn_not_found",
    );
  }

  if (
    row.user_id !== input.userId ||
    row.project_id !== input.projectId ||
    row.role !== "assistant"
  ) {
    throw new RouteAccessError(
      409,
      "assistant_turn_scope_mismatch",
    );
  }

  const text = String(row.content ?? "");

  if (!text.trim()) {
    throw new RouteAccessError(
      409,
      "assistant_turn_empty",
    );
  }

  const conversationId =
    String(row.conversation_id ?? "");

  if (!conversationId) {
    throw new RouteAccessError(
      409,
      "assistant_turn_conversation_missing",
    );
  }

  return {
    text,
    conversationId,
  };
}

export function validateCanonicalAssistantRow(input: {
  row: CanonicalAssistantRow | null;
  userId: string;
  projectId: string;
}): string {
  return validateCanonicalAssistantTurn(input).text;
}

export async function loadCanonicalAssistantTurnForTurn(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  turnId: string;
}): Promise<CanonicalAssistantTurn> {
  const ids = deriveChatTurnIds({
    userId: input.userId,
    turnId: input.turnId,
  });

  const { data, error } = await input.supabase
    .from("messages")
    .select(
      "user_id,project_id,conversation_id,role,content",
    )
    .eq("id", ids.assistantMessageId)
    .maybeSingle();

  if (error) throw error;

  return validateCanonicalAssistantTurn({
    row:
      (data as CanonicalAssistantRow | null) ??
      null,
    userId: input.userId,
    projectId: input.projectId,
  });
}

export async function loadCanonicalAssistantTextForTurn(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  turnId: string;
}): Promise<string> {
  return (
    await loadCanonicalAssistantTurnForTurn(input)
  ).text;
}

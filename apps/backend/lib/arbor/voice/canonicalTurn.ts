import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveChatTurnIds } from "@/lib/chat/turnIdentity";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

export type CanonicalAssistantRow = {
  user_id: string;
  project_id: string;
  role: string;
  content: unknown;
};

export function validateCanonicalAssistantRow(input: {
  row: CanonicalAssistantRow | null;
  userId: string;
  projectId: string;
}): string {
  const { row } = input;

  if (!row) {
    throw new RouteAccessError(404, "assistant_turn_not_found");
  }

  if (
    row.user_id !== input.userId ||
    row.project_id !== input.projectId ||
    row.role !== "assistant"
  ) {
    throw new RouteAccessError(409, "assistant_turn_scope_mismatch");
  }

  const text = String(row.content ?? "").trim();

  if (!text) {
    throw new RouteAccessError(409, "assistant_turn_empty");
  }

  return text;
}

export async function loadCanonicalAssistantTextForTurn(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  turnId: string;
}): Promise<string> {
  const ids = deriveChatTurnIds({
    userId: input.userId,
    turnId: input.turnId,
  });

  const { data, error } = await input.supabase
    .from("messages")
    .select("user_id,project_id,role,content")
    .eq("id", ids.assistantMessageId)
    .maybeSingle();

  if (error) throw error;

  return validateCanonicalAssistantRow({
    row: (data as CanonicalAssistantRow | null) ?? null,
    userId: input.userId,
    projectId: input.projectId,
  });
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveChatTurnIds } from "@/lib/chat/turnIdentity";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

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

  if (!data) {
    throw new RouteAccessError(404, "assistant_turn_not_found");
  }

  if (
    data.user_id !== input.userId ||
    data.project_id !== input.projectId ||
    data.role !== "assistant"
  ) {
    throw new RouteAccessError(409, "assistant_turn_scope_mismatch");
  }

  const text = String(data.content ?? "").trim();

  if (!text) {
    throw new RouteAccessError(409, "assistant_turn_empty");
  }

  return text;
}

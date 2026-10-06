import type { SupabaseClient } from "@supabase/supabase-js";

export type Msg = { role: "user" | "assistant" | "system"; content: string };

export function buildChatSuccessResponse(params: {
  projectId: string;
  conversationId: string;
  assistantText: string;
  flagged?: boolean;
}) {
  return {
    ok: true as const,
    projectId: params.projectId,
    conversationId: params.conversationId,
    assistantText: params.assistantText,
    ...(params.flagged ? { flagged: true as const } : {}),
  };
}


export async function loadRecentMessages(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  limit = 20,
): Promise<Msg[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role,content,created_at,deleted_at,expires_at")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  const messages = (data ?? []) as Array<{
    role: Msg["role"];
    content: string;
  }>;
  return messages
    .reverse()
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}


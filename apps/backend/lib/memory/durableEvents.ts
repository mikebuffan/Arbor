import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const CHAT_COMPLETED_PERSISTENCE_ERROR_CODE =
  "chat_completed_insert_failed";

export class ChatCompletedPersistenceError extends Error {
  readonly code = CHAT_COMPLETED_PERSISTENCE_ERROR_CODE;

  constructor() {
    super(CHAT_COMPLETED_PERSISTENCE_ERROR_CODE);
    this.name = "ChatCompletedPersistenceError";
  }
}

export async function writeDurableChatCompletedEvent(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string;
}): Promise<void> {
  const row = {
    user_id: params.userId,
    project_id: params.projectId,
    question: "",
    ops: {},
    memory_key: null,
    event_type: "chat_completed",
    payload: {
      conversation_id: params.conversationId,
    },
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await params.supabase
      .from("memory_pending")
      .insert(row);

    if (error) {
      throw new ChatCompletedPersistenceError();
    }
  } catch (error: unknown) {
    if (error instanceof ChatCompletedPersistenceError) {
      throw error;
    }
    throw new ChatCompletedPersistenceError();
  }
}

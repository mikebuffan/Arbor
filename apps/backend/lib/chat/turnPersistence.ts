import type { SupabaseClient } from "@supabase/supabase-js";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import { guardAssistantText } from "@/lib/guards/responseLanguageGuard";
import { deriveChatTurnIds } from "@/lib/chat/turnIdentity";

export type ConversationRecord = {
  id: string;
  user_id: string;
  project_id: string;
};

export type TurnMessageRecord = {
  id: string;
  user_id: string;
  project_id: string;
  conversation_id: string;
  episode_id: string | null;
  role: "user" | "assistant";
  content: string;
};

export interface ChatTurnStore {
  getConversation(id: string): Promise<ConversationRecord | null>;
  insertConversation(record: ConversationRecord): Promise<void>;
  getMessage(id: string): Promise<TurnMessageRecord | null>;
  insertMessage(record: TurnMessageRecord): Promise<void>;
}

function throwIfError(error: unknown): void {
  if (error) throw error;
}

export function createSupabaseChatTurnStore(
  supabase: SupabaseClient,
): ChatTurnStore {
  return {
    async getConversation(id) {
      const { data, error } = await supabase
        .from("conversations")
        .select("id,user_id,project_id")
        .eq("id", id)
        .maybeSingle();
      throwIfError(error);
      return (data as ConversationRecord | null) ?? null;
    },

    async insertConversation(record) {
      const { error } = await supabase.from("conversations").insert({
        ...record,
        title: null,
      });
      throwIfError(error);
    },

    async getMessage(id) {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id,user_id,project_id,conversation_id,episode_id,role,content",
        )
        .eq("id", id)
        .maybeSingle();
      throwIfError(error);
      return (data as TurnMessageRecord | null) ?? null;
    },

    async insertMessage(record) {
      const { error } = await supabase.from("messages").insert(record);
      throwIfError(error);
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function turnConflict(): never {
  throw new RouteAccessError(409, "turn_conflict");
}

function assertConversationScope(
  record: ConversationRecord,
  scope: { userId: string; projectId: string },
): void {
  if (
    record.user_id !== scope.userId ||
    record.project_id !== scope.projectId
  ) {
    turnConflict();
  }
}

function assertUserMessageScope(
  record: TurnMessageRecord,
  scope: {
    userId: string;
    projectId: string;
    conversationId: string;
    userText: string;
  },
): void {
  if (
    record.user_id !== scope.userId ||
    record.project_id !== scope.projectId ||
    record.conversation_id !== scope.conversationId ||
    record.role !== "user" ||
    record.content !== scope.userText
  ) {
    turnConflict();
  }
}

function assertAssistantMessageScope(
  record: TurnMessageRecord,
  scope: { userId: string; projectId: string; conversationId: string },
): void {
  if (
    record.user_id !== scope.userId ||
    record.project_id !== scope.projectId ||
    record.conversation_id !== scope.conversationId ||
    record.role !== "assistant"
  ) {
    turnConflict();
  }
}

async function insertOrReloadConversation(params: {
  store: ChatTurnStore;
  record: ConversationRecord;
}): Promise<void> {
  const { store, record } = params;
  try {
    await store.insertConversation(record);
    return;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }

  const concurrent = await store.getConversation(record.id);
  if (!concurrent) throw new Error("turn_conversation_conflict_unreadable");
  assertConversationScope(concurrent, {
    userId: record.user_id,
    projectId: record.project_id,
  });
}

export async function resolveConversationForTurn(params: {
  store: ChatTurnStore;
  userId: string;
  projectId: string;
  turnId: string;
  userText: string;
  requestedConversationId?: string;
  assertRequestedConversationOwned: (conversationId: string) => Promise<void>;
}) {
  const {
    store,
    userId,
    projectId,
    turnId,
    userText,
    requestedConversationId,
    assertRequestedConversationOwned,
  } = params;
  const ids = deriveChatTurnIds({ userId, turnId });
  const expectedConversationId =
    requestedConversationId ?? ids.conversationId;
  const existingUserMessage = await store.getMessage(ids.userMessageId);

  if (existingUserMessage) {
    assertUserMessageScope(existingUserMessage, {
      userId,
      projectId,
      conversationId: expectedConversationId,
      userText,
    });
    await assertRequestedConversationOwned(existingUserMessage.conversation_id);
    return { conversationId: existingUserMessage.conversation_id, ids };
  }

  if (requestedConversationId) {
    await assertRequestedConversationOwned(requestedConversationId);
    return { conversationId: requestedConversationId, ids };
  }

  const existingConversation = await store.getConversation(ids.conversationId);
  if (existingConversation) {
    assertConversationScope(existingConversation, { userId, projectId });
  } else {
    await insertOrReloadConversation({
      store,
      record: {
        id: ids.conversationId,
        user_id: userId,
        project_id: projectId,
      },
    });
  }

  return { conversationId: ids.conversationId, ids };
}

export async function claimUserTurn(params: {
  store: ChatTurnStore;
  messageId: string;
  userId: string;
  projectId: string;
  conversationId: string;
  episodeId: string | null;
  userText: string;
}): Promise<{ created: boolean; record: TurnMessageRecord }> {
  const { store, messageId, userId, projectId, conversationId, episodeId, userText } =
    params;
  const record: TurnMessageRecord = {
    id: messageId,
    user_id: userId,
    project_id: projectId,
    conversation_id: conversationId,
    episode_id: episodeId,
    role: "user",
    content: userText,
  };
  const existing = await store.getMessage(messageId);

  if (existing) {
    assertUserMessageScope(existing, {
      userId,
      projectId,
      conversationId,
      userText,
    });
    return { created: false, record: existing };
  }

  try {
    await store.insertMessage(record);
    return { created: true, record };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }

  const concurrent = await store.getMessage(messageId);
  if (!concurrent) throw new Error("turn_user_message_conflict_unreadable");
  assertUserMessageScope(concurrent, {
    userId,
    projectId,
    conversationId,
    userText,
  });
  return { created: false, record: concurrent };
}

export async function getCompletedAssistantTurn(params: {
  store: ChatTurnStore;
  messageId: string;
  userId: string;
  projectId: string;
  conversationId: string;
}): Promise<TurnMessageRecord | null> {
  const { store, messageId, userId, projectId, conversationId } = params;
  const existing = await store.getMessage(messageId);
  if (!existing) return null;
  assertAssistantMessageScope(existing, { userId, projectId, conversationId });
  return existing;
}

export async function persistFinalAssistantTurn(params: {
  store: ChatTurnStore;
  messageId: string;
  userId: string;
  projectId: string;
  conversationId: string;
  episodeId: string | null;
  assistantText: string;
}): Promise<{ created: boolean; record: TurnMessageRecord }> {
  const {
    store,
    messageId,
    userId,
    projectId,
    conversationId,
    episodeId,
    assistantText,
  } = params;
  const record: TurnMessageRecord = {
    id: messageId,
    user_id: userId,
    project_id: projectId,
    conversation_id: conversationId,
    episode_id: episodeId,
    role: "assistant",
    content: assistantText,
  };

  const existing = await store.getMessage(messageId);
  if (existing) {
    assertAssistantMessageScope(existing, { userId, projectId, conversationId });
    return { created: false, record: existing };
  }

  try {
    await store.insertMessage(record);
    return { created: true, record };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }

  const concurrent = await store.getMessage(messageId);
  if (!concurrent) {
    throw new Error("turn_assistant_message_conflict_unreadable");
  }
  assertAssistantMessageScope(concurrent, { userId, projectId, conversationId });
  return { created: false, record: concurrent };
}

export async function finalizeAndPersistAssistantTurn(params: {
  store: ChatTurnStore;
  messageId: string;
  userId: string;
  projectId: string;
  conversationId: string;
  episodeId: string | null;
  rawAssistantText: string;
  assistantPreface?: string;
  postcheck: (assistantText: string) => Promise<{
    approved: boolean;
    replacement?: string;
  }>;
}) {
  const guardedText = guardAssistantText(params.rawAssistantText).text;
  const assistantText = params.assistantPreface
    ? `${params.assistantPreface}\n\n${guardedText}`
    : guardedText;
  const postcheck = await params.postcheck(assistantText);
  const finalText = postcheck.approved
    ? assistantText
    : (postcheck.replacement ?? assistantText);
  const persisted = await persistFinalAssistantTurn({
    store: params.store,
    messageId: params.messageId,
    userId: params.userId,
    projectId: params.projectId,
    conversationId: params.conversationId,
    episodeId: params.episodeId,
    assistantText: finalText,
  });

  return {
    assistantText: persisted.record.content,
    created: persisted.created,
    flagged: !postcheck.approved && persisted.record.content === finalText,
  };
}

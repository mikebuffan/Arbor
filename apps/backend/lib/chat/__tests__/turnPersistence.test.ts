import { describe, expect, it } from "vitest";
import { deriveChatTurnIds } from "@/lib/chat/turnIdentity";
import {
  claimUserTurn,
  finalizeAndPersistAssistantTurn,
  getCompletedAssistantTurn,
  resolveConversationForTurn,
  type ChatTurnStore,
  type ConversationRecord,
  type TurnMessageRecord,
} from "@/lib/chat/turnPersistence";
import { guardAssistantText } from "@/lib/guards/responseLanguageGuard";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const EPISODE_ID = "33333333-3333-4333-8333-333333333333";

class MemoryTurnStore implements ChatTurnStore {
  readonly conversations = new Map<string, ConversationRecord>();
  readonly messages = new Map<string, TurnMessageRecord>();

  async getConversation(id: string) {
    return this.conversations.get(id) ?? null;
  }

  async insertConversation(record: ConversationRecord) {
    await Promise.resolve();
    if (this.conversations.has(record.id)) throw { code: "23505" };
    this.conversations.set(record.id, record);
  }

  async getMessage(id: string) {
    return this.messages.get(id) ?? null;
  }

  async insertMessage(record: TurnMessageRecord) {
    await Promise.resolve();
    if (this.messages.has(record.id)) throw { code: "23505" };
    this.messages.set(record.id, record);
  }
}

async function startTurn(params: {
  store: ChatTurnStore;
  turnId: string;
  userText: string;
  requestedConversationId?: string;
}) {
  const resolved = await resolveConversationForTurn({
    ...params,
    userId: USER_ID,
    projectId: PROJECT_ID,
    assertRequestedConversationOwned: async () => undefined,
  });
  const claim = await claimUserTurn({
    store: params.store,
    messageId: resolved.ids.userMessageId,
    userId: USER_ID,
    projectId: PROJECT_ID,
    conversationId: resolved.conversationId,
    episodeId: EPISODE_ID,
    userText: params.userText,
  });
  return { ...resolved, claim };
}

async function persistApproved(params: {
  store: ChatTurnStore;
  turnId: string;
  conversationId: string;
  assistantText: string;
}) {
  const ids = deriveChatTurnIds({ userId: USER_ID, turnId: params.turnId });
  return finalizeAndPersistAssistantTurn({
    store: params.store,
    messageId: ids.assistantMessageId,
    userId: USER_ID,
    projectId: PROJECT_ID,
    conversationId: params.conversationId,
    episodeId: EPISODE_ID,
    rawAssistantText: params.assistantText,
    postcheck: async () => ({ approved: true }),
  });
}

describe("durable chat turns", () => {
  it("persists the normal final assistant response", async () => {
    const store = new MemoryTurnStore();
    const turnId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const turn = await startTurn({ store, turnId, userText: "Hello" });

    const result = await persistApproved({
      store,
      turnId,
      conversationId: turn.conversationId,
      assistantText: "Durable answer",
    });

    expect(result).toMatchObject({
      assistantText: "Durable answer",
      created: true,
      flagged: false,
    });
    expect(store.messages.get(turn.ids.assistantMessageId)?.content).toBe(
      "Durable answer",
    );
  });

  it("persists the exact postcheck safety replacement", async () => {
    const store = new MemoryTurnStore();
    const turnId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const turn = await startTurn({ store, turnId, userText: "Unsafe topic" });

    const result = await finalizeAndPersistAssistantTurn({
      store,
      messageId: turn.ids.assistantMessageId,
      userId: USER_ID,
      projectId: PROJECT_ID,
      conversationId: turn.conversationId,
      episodeId: EPISODE_ID,
      rawAssistantText: "Unsafe draft",
      postcheck: async () => ({
        approved: false,
        replacement: "Exact safe replacement",
      }),
    });

    expect(result).toMatchObject({
      assistantText: "Exact safe replacement",
      created: true,
      flagged: true,
    });
    expect(store.messages.get(turn.ids.assistantMessageId)?.content).toBe(
      "Exact safe replacement",
    );
  });

  it("persists the exact response-language fallback", async () => {
    const store = new MemoryTurnStore();
    const turnId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const turn = await startTurn({ store, turnId, userText: "Remember this" });
    const rejectedDraft = "I don't remember between conversations.";
    const expectedFallback = guardAssistantText(rejectedDraft).text;

    const result = await persistApproved({
      store,
      turnId,
      conversationId: turn.conversationId,
      assistantText: rejectedDraft,
    });

    expect(result.assistantText).toBe(expectedFallback);
    expect(store.messages.get(turn.ids.assistantMessageId)?.content).toBe(
      expectedFallback,
    );
  });

  it("returns the durable completed response on a sequential retry", async () => {
    const store = new MemoryTurnStore();
    const turnId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const first = await startTurn({ store, turnId, userText: "Retry me" });
    await persistApproved({
      store,
      turnId,
      conversationId: first.conversationId,
      assistantText: "First durable answer",
    });

    const retry = await startTurn({ store, turnId, userText: "Retry me" });
    const completed = await getCompletedAssistantTurn({
      store,
      messageId: retry.ids.assistantMessageId,
      userId: USER_ID,
      projectId: PROJECT_ID,
      conversationId: retry.conversationId,
    });

    expect(retry.claim.created).toBe(false);
    expect(completed?.content).toBe("First durable answer");
    expect(store.messages).toHaveLength(2);
  });

  it("converges concurrent executions on one durable assistant response", async () => {
    const store = new MemoryTurnStore();
    const turnId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const turn = await startTurn({ store, turnId, userText: "Race" });

    const results = await Promise.all([
      persistApproved({
        store,
        turnId,
        conversationId: turn.conversationId,
        assistantText: "Candidate A",
      }),
      persistApproved({
        store,
        turnId,
        conversationId: turn.conversationId,
        assistantText: "Candidate B",
      }),
    ]);

    expect(results[0].assistantText).toBe(results[1].assistantText);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(
      [...store.messages.values()].filter(({ role }) => role === "assistant"),
    ).toHaveLength(1);
  });

  it("keeps identical text as distinct turns when turn IDs differ", async () => {
    const store = new MemoryTurnStore();
    const conversationId = "44444444-4444-4444-8444-444444444444";
    const firstTurnId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    const secondTurnId = "12121212-1212-4212-8212-121212121212";
    const first = await startTurn({
      store,
      turnId: firstTurnId,
      userText: "Same words",
      requestedConversationId: conversationId,
    });
    const second = await startTurn({
      store,
      turnId: secondTurnId,
      userText: "Same words",
      requestedConversationId: conversationId,
    });
    await Promise.all([
      persistApproved({
        store,
        turnId: firstTurnId,
        conversationId,
        assistantText: "First answer",
      }),
      persistApproved({
        store,
        turnId: secondTurnId,
        conversationId,
        assistantText: "Second answer",
      }),
    ]);

    expect(first.ids.userMessageId).not.toBe(second.ids.userMessageId);
    expect(first.ids.assistantMessageId).not.toBe(second.ids.assistantMessageId);
    expect(store.messages).toHaveLength(4);
  });

  it("fails closed when one turn ID is reused with conflicting text", async () => {
    const store = new MemoryTurnStore();
    const turnId = "13131313-1313-4313-8313-131313131313";
    await startTurn({ store, turnId, userText: "Original text" });

    await expect(
      startTurn({ store, turnId, userText: "Changed text" }),
    ).rejects.toMatchObject({ status: 409, code: "turn_conflict" });
  });

  it("fails closed when one turn ID is reused in another conversation", async () => {
    const store = new MemoryTurnStore();
    const turnId = "16161616-1616-4616-8616-161616161616";
    await startTurn({
      store,
      turnId,
      userText: "Scoped text",
      requestedConversationId: "17171717-1717-4717-8717-171717171717",
    });

    await expect(
      startTurn({
        store,
        turnId,
        userText: "Scoped text",
        requestedConversationId: "18181818-1818-4818-8818-181818181818",
      }),
    ).rejects.toMatchObject({ status: 409, code: "turn_conflict" });
  });

  it("derives different message identities for different authenticated users", () => {
    const turnId = "19191919-1919-4919-8919-191919191919";
    const first = deriveChatTurnIds({ userId: USER_ID, turnId });
    const second = deriveChatTurnIds({
      userId: "20202020-2020-4020-8020-202020202020",
      turnId,
    });

    expect(first.userMessageId).not.toBe(second.userMessageId);
    expect(first.assistantMessageId).not.toBe(second.assistantMessageId);
  });

  it("recovers a first-message retry when the conversation response was lost", async () => {
    const store = new MemoryTurnStore();
    const turnId = "14141414-1414-4414-8414-141414141414";
    const first = await startTurn({ store, turnId, userText: "First message" });
    await persistApproved({
      store,
      turnId,
      conversationId: first.conversationId,
      assistantText: "Created conversation answer",
    });

    const retry = await startTurn({ store, turnId, userText: "First message" });
    const completed = await getCompletedAssistantTurn({
      store,
      messageId: retry.ids.assistantMessageId,
      userId: USER_ID,
      projectId: PROJECT_ID,
      conversationId: retry.conversationId,
    });

    expect(retry.conversationId).toBe(first.conversationId);
    expect(retry.claim.created).toBe(false);
    expect(completed?.content).toBe("Created conversation answer");
    expect(store.conversations).toHaveLength(1);
    expect(store.messages).toHaveLength(2);
  });

  it("does not claim success when final assistant persistence fails", async () => {
    const base = new MemoryTurnStore();
    const turnId = "15151515-1515-4515-8515-151515151515";
    const turn = await startTurn({ store: base, turnId, userText: "Persist" });
    const failingStore: ChatTurnStore = {
      ...base,
      getConversation: base.getConversation.bind(base),
      insertConversation: base.insertConversation.bind(base),
      getMessage: base.getMessage.bind(base),
      insertMessage: async () => {
        throw new Error("database unavailable");
      },
    };

    await expect(
      persistApproved({
        store: failingStore,
        turnId,
        conversationId: turn.conversationId,
        assistantText: "Must not be returned",
      }),
    ).rejects.toThrow("database unavailable");
  });
});

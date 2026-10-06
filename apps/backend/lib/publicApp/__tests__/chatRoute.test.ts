import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePublicAlphaUser: vi.fn(),
  publicModelConfig: vi.fn(),
  generateWithArborLM: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/publicApp/alphaAuth", () => {
  class PublicAlphaError extends Error {
    constructor(public code: string, public status: number) {
      super(code);
    }
  }
  return {
    requirePublicAlphaUser: mocks.requirePublicAlphaUser,
    PublicAlphaError,
  };
});
vi.mock("@/lib/publicApp/arborLM", () => {
  class ArborLMUnavailable extends Error {
    constructor(public code: string, public httpStatus = 503) {
      super(code);
    }
  }
  return {
    publicModelConfig: mocks.publicModelConfig,
    generateWithArborLM: mocks.generateWithArborLM,
    ArborLMUnavailable,
  };
});

import { POST } from "@/app/api/public/chat/route";

const thread = "11111111-1111-4111-8111-111111111111";
const turn = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";

function query(result: { data?: unknown; count?: number; error?: unknown }) {
  const reply = { error: null, ...result };
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    then: (resolve: (value: typeof reply) => unknown) =>
      Promise.resolve(reply).then(resolve),
  };
  for (const key of ["select", "eq", "gte", "order", "insert", "update"] as const) {
    q[key].mockReturnValue(q);
  }
  for (const key of ["limit", "maybeSingle", "single"] as const) {
    q[key].mockResolvedValue(reply);
  }
  return q;
}

function request(text = "Please reply", conversationId?: string) {
  return new Request("https://alpha.example.test/api/public/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      turnId: turn,
      userText: text,
      ...(conversationId ? { conversationId } : {}),
    }),
  });
}

describe("public chat retry and isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePublicAlphaUser.mockResolvedValue({
      userId,
      db: { from: mocks.from },
    });
    mocks.publicModelConfig.mockReturnValue({
      model: "arbor-lm-v0.3",
    });
    mocks.generateWithArborLM.mockResolvedValue("Here is your reply.");
  });

  it("returns a saved assistant reply without calling inference again", async () => {
    const existing = query({ data: [
      { user_id: userId, conversation_id: thread, turn_id: turn,
        role: "user", content: "Please reply" },
      { user_id: userId, conversation_id: thread, turn_id: turn,
        role: "assistant", content: "Previously completed." },
    ] });
    mocks.from.mockReturnValueOnce(existing);
    const response = await POST(request("Please reply"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      conversationId: thread,
      assistantText: "Previously completed.",
    });
    expect(existing.eq).toHaveBeenCalledWith("user_id", userId);
    expect(existing.eq).toHaveBeenCalledWith("turn_id", turn);
    expect(mocks.generateWithArborLM).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

  it("completes a saved unanswered turn without inserting a second user turn", async () => {
    const existing = query({ data: [
      { user_id: userId, conversation_id: thread, turn_id: turn,
        role: "user", content: "Please reply" },
    ] });
    const conversation = query({ data: { id: thread } });
    const history = query({ data: [
      { role: "user", content: "Please reply" },
    ] });
    const assistant = query({});
    const touch = query({});
    mocks.from.mockReturnValueOnce(existing)
      .mockReturnValueOnce(conversation)
      .mockReturnValueOnce(history)
      .mockReturnValueOnce(assistant)
      .mockReturnValueOnce(touch);
    const response = await POST(request("Please reply", thread));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      conversationId: thread,
      assistantText: "Here is your reply.",
    });
    expect(existing.eq).toHaveBeenCalledWith("user_id", userId);
    expect(conversation.eq).toHaveBeenCalledWith("user_id", userId);
    expect(history.eq).toHaveBeenCalledWith("user_id", userId);
    expect(assistant.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: userId,
      conversation_id: thread,
      turn_id: turn,
      role: "assistant",
    }));
    expect(mocks.from).toHaveBeenCalledTimes(5);
    expect(mocks.generateWithArborLM).toHaveBeenCalledOnce();
  });

  it("rejects changed retry content before querying or generating another reply", async () => {
    const existing = query({ data: [
      { user_id: userId, conversation_id: thread, turn_id: turn,
        role: "user", content: "Please reply" },
    ] });
    mocks.from.mockReturnValueOnce(existing);
    const response = await POST(request("Different text", thread));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "turn_conflict" });
    expect(mocks.generateWithArborLM).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

  it("does not infer a missing foreign conversation exists", async () => {
    const existing = query({ data: [] });
    const quota = query({ count: 0 });
    const inaccessible = query({ data: null });
    mocks.from.mockReturnValueOnce(existing)
      .mockReturnValueOnce(quota)
      .mockReturnValueOnce(inaccessible);
    const response = await POST(request("Please reply", thread));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: "conversation_not_found",
    });
    expect(inaccessible.eq).toHaveBeenCalledWith("user_id", userId);
    expect(mocks.generateWithArborLM).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePublicAlphaUser: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/publicApp/alphaAuth", async () => {
  class PublicAlphaError extends Error {
    constructor(
      public code: string,
      public status: number,
    ) {
      super(code);
    }
  }
  return {
    requirePublicAlphaUser: mocks.requirePublicAlphaUser,
    PublicAlphaError,
  };
});

import { GET as getConversation, DELETE as deleteConversation } from
  "@/app/api/public/conversations/[id]/route";
import { GET as listConversations } from
  "@/app/api/public/conversations/route";

const foreignConversation = "11111111-1111-4111-8111-111111111111";

function fakeQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: result, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: result, error: null }),
  };
  query.select.mockReturnValue(query);
  query.delete.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return query;
}

describe("public conversation route ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePublicAlphaUser.mockResolvedValue({
      userId: "signed-in-user-a",
      db: { from: mocks.from },
    });
  });

  it("does not read foreign user messages if conversation lookup is absent", async () => {
    const conversations = fakeQuery(null);
    mocks.from.mockReturnValueOnce(conversations);
    const response = await getConversation(
      new Request("https://alpha.example.test/api/public/conversations/" +
        foreignConversation),
      { params: Promise.resolve({ id: foreignConversation }) },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: "conversation_not_found",
    });
    expect(conversations.eq).toHaveBeenCalledWith(
      "user_id", "signed-in-user-a",
    );
    expect(conversations.eq).toHaveBeenCalledWith(
      "id", foreignConversation,
    );
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).not.toHaveBeenCalledWith("public_app_messages");
  });

  it("does not query conversations for invalid identifiers", async () => {
    const response = await getConversation(
      new Request("https://alpha.example.test/api/public/conversations/nope"),
      { params: Promise.resolve({ id: "nope" }) },
    );
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("returns retry turn IDs only for an owner-verified conversation", async () => {
    const conversation = fakeQuery({
      id: foreignConversation,
      title: "Saved unfinished turn",
    });
    const messages = fakeQuery([{
      id: "33333333-3333-4333-8333-333333333333",
      turn_id: "22222222-2222-4222-8222-222222222222",
      role: "user",
      content: "Please reply",
      created_at: "2026-09-21T00:00:00Z",
    }]);
    mocks.from.mockReturnValueOnce(conversation)
      .mockReturnValueOnce(messages);
    const response = await getConversation(
      new Request("https://alpha.example.test/api/public/conversations/" +
        foreignConversation),
      { params: Promise.resolve({ id: foreignConversation }) },
    );
    expect(response.status).toBe(200);
    expect(conversation.eq).toHaveBeenCalledWith(
      "user_id", "signed-in-user-a",
    );
    expect(messages.eq).toHaveBeenCalledWith(
      "user_id", "signed-in-user-a",
    );
    expect(messages.eq).toHaveBeenCalledWith(
      "conversation_id", foreignConversation,
    );
    expect(messages.select).toHaveBeenCalledWith(
      "id,turn_id,role,content,created_at",
    );
    expect((await response.json()).messages[0].turn_id).toBe(
      "22222222-2222-4222-8222-222222222222",
    );
  });

  it("cannot delete a foreign or missing conversation", async () => {
    const lookup = fakeQuery(null);
    mocks.from.mockReturnValueOnce(lookup);
    const response = await deleteConversation(
      new Request("https://alpha.example.test/api/public/conversations/" +
        foreignConversation, { method: "DELETE" }),
      { params: Promise.resolve({ id: foreignConversation }) },
    );
    expect(response.status).toBe(404);
    expect(lookup.eq).toHaveBeenCalledWith(
      "user_id", "signed-in-user-a",
    );
    expect(lookup.delete).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

  it("scopes deletion to the authenticated owner on both queries", async () => {
    const lookup = fakeQuery({ id: foreignConversation });
    const removal = fakeQuery(null);
    mocks.from.mockReturnValueOnce(lookup).mockReturnValueOnce(removal);
    const response = await deleteConversation(
      new Request("https://alpha.example.test/api/public/conversations/" +
        foreignConversation, { method: "DELETE" }),
      { params: Promise.resolve({ id: foreignConversation }) },
    );
    expect(response.status).toBe(200);
    expect(removal.delete).toHaveBeenCalledOnce();
    expect(removal.eq).toHaveBeenCalledWith(
      "user_id", "signed-in-user-a",
    );
    expect(removal.eq).toHaveBeenCalledWith(
      "id", foreignConversation,
    );
  });

  it("scopes the conversation list to the authenticated user", async () => {
    const list = fakeQuery([]);
    mocks.from.mockReturnValueOnce(list);
    const response = await listConversations(
      new Request("https://alpha.example.test/api/public/conversations"),
    );
    expect(response.status).toBe(200);
    expect(list.eq).toHaveBeenCalledWith(
      "user_id", "signed-in-user-a",
    );
    expect(await response.json()).toMatchObject({
      conversations: [],
    });
  });
});

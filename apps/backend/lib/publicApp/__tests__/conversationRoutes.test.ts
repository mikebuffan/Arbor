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

import { GET as getConversation } from
  "@/app/api/public/conversations/[id]/route";
import { GET as listConversations } from
  "@/app/api/public/conversations/route";

const foreignConversation = "11111111-1111-4111-8111-111111111111";

function fakeQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: result, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: result, error: null }),
  };
  query.select.mockReturnValue(query);
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

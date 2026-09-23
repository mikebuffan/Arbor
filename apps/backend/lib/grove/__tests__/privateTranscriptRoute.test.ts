import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  flags: vi.fn(),
  authorize: vi.fn(),
  createStore: vi.fn(),
  listRecent: vi.fn(),
}));
vi.mock("@/lib/grove/privateConversationLoop", () => ({
  grovePrivateTurnFeatures: mocks.flags,
}));
vi.mock("@/lib/grove/privateReadBroker", () => ({
  authorizePrivateGroveConversation: mocks.authorize,
}));
vi.mock("@/lib/grove/privateTranscriptStore", () => ({
  createSupabaseGrovePrivateTranscriptStore: mocks.createStore,
}));

import { GET } from "@/app/api/grove/chat/history/route";

const ids = {
  groveUserId: "00000000-0000-4000-8000-000000000001",
  fireflyOwner: "00000000-0000-4000-8000-000000000002",
  projectId: "00000000-0000-4000-8000-000000000003",
  conversationId: "00000000-0000-4000-8000-000000000004",
  requestId: "00000000-0000-4000-8000-000000000005",
};
const origin = "https://grove-private.example.org";
function req(suffix = "", token = "synthetic-grove-token") {
  return new Request(origin + "/api/grove/chat/history?" +
    new URLSearchParams({
      projectId: ids.projectId,
      conversationId: ids.conversationId,
    }).toString() + suffix, {
      headers: token ? { authorization: "Bearer " + token } : {},
    });
}
const row = {
  grove_user_id: ids.groveUserId,
  firefly_project_id: ids.projectId,
  firefly_conversation_id: ids.conversationId,
  request_id: ids.requestId,
  user_text: "Continue what we started.",
  assistant_text: "The objective remains open.",
  reply_verification: "unverified_model_text",
  ark_connected: true,
  continuity_fetched: true,
  created_at: "2026-09-23T06:10:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.flags.mockReturnValue({
    chatEnabled: true, modelEnabled: false,
    cognitivePreviewEnabled: false, transcriptEnabled: true,
  });
  mocks.authorize.mockResolvedValue({
    access: "read-only",
    groveUserId: ids.groveUserId,
    fireflyUserId: ids.fireflyOwner,
    projectId: ids.projectId,
    conversationId: ids.conversationId,
    groveAdmin: { privateClient: "grove" },
    fireflyAdmin: { privateClient: "firefly" },
  });
  mocks.createStore.mockReturnValue({ listRecent: mocks.listRecent });
  mocks.listRecent.mockResolvedValue([row]);
});

describe("Grove transcript REST read — independent private scope", () => {
  it("is invisible before authorization when either flag is OFF", async () => {
    for (const flags of [
      { chatEnabled: false, transcriptEnabled: true },
      { chatEnabled: true, transcriptEnabled: false },
    ]) {
      mocks.flags.mockReturnValueOnce(flags);
      const result = await GET(req("&unexpected=bad"));
      expect(result.status).toBe(404);
      expect((await result.json()).error).toBe("grove_private_history_not_enabled");
      expect(result.headers.get("cache-control")).toContain("no-store");
    }
    expect(mocks.authorize).not.toHaveBeenCalled();
    expect(mocks.createStore).not.toHaveBeenCalled();
  });

  it("rejects malformed, extra and duplicate scope before owner/provider reads", async () => {
    for (const suffix of [
      "&ownerId=foreign",
      "&projectId=" + ids.projectId,
      "&conversationId=not-a-uuid",
    ]) {
      const result = await GET(req(suffix));
      expect(result.status).toBe(400);
    }
    expect(mocks.authorize).not.toHaveBeenCalled();
    expect(mocks.createStore).not.toHaveBeenCalled();
  });

  it("rejects uninvited/unowned conversation before transcript access", async () => {
    mocks.authorize.mockRejectedValueOnce(new Error("private provider detail"));
    const denied = await GET(req(""));
    expect(denied.status).toBe(500);
    expect(JSON.stringify(await denied.json())).not.toContain("private provider detail");
    expect(mocks.createStore).not.toHaveBeenCalled();
  });

  it("requires returned authorization to match exact requested conversation", async () => {
    mocks.authorize.mockResolvedValueOnce({
      access: "read-only",
      groveUserId: ids.groveUserId,
      projectId: ids.projectId,
      conversationId: "00000000-0000-4000-8000-000000000099",
      groveAdmin: { privateClient: "grove" },
    });
    const denied = await GET(req(""));
    expect(denied.status).toBe(403);
    expect(mocks.createStore).not.toHaveBeenCalled();
  });

  it("returns only bounded complete pairs, no owner IDs, no pretend execution", async () => {
    const request = req("");
    const response = await GET(request);
    expect(mocks.authorize).toHaveBeenCalledWith(
      request, ids.projectId, ids.conversationId,
    );
    expect(mocks.createStore).toHaveBeenCalledWith({
      privateClient: "grove",
    });
    expect(mocks.listRecent).toHaveBeenCalledWith({
      groveUserId: ids.groveUserId,
      projectId: ids.projectId,
      conversationId: ids.conversationId,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const payload = await response.json();
    expect(payload).toEqual({
      ok: true, projectId: ids.projectId,
      conversationId: ids.conversationId,
      order: "newest_first",
      windowLimit: 6,
      historyMayBeTruncated: false,
      turns: [{
        requestId: ids.requestId,
        userText: row.user_text,
        assistantText: row.assistant_text,
        replyVerification: "unverified_model_text",
        createdAt: row.created_at,
      }],
      liveExecutionVerified: false,
      workReceipts: [],
      grantsExecution: false,
    });
    expect(JSON.stringify(payload)).not.toContain(ids.groveUserId);
    expect(JSON.stringify(payload)).not.toContain(ids.fireflyOwner);
  });

  it("reveals when the six-pair window may omit older messages", async () => {
    mocks.listRecent.mockResolvedValueOnce(
      Array.from({ length: 6 }, () => row),
    );
    const response = await GET(req());
    expect((await response.json()).historyMayBeTruncated).toBe(true);
  });

  it("fails closed if the transcript provider fails without leaking text", async () => {
    mocks.listRecent.mockRejectedValueOnce(
      new Error("secret private sentence in database"),
    );
    const response = await GET(req());
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json()))
      .not.toContain("secret private sentence");
  });
});

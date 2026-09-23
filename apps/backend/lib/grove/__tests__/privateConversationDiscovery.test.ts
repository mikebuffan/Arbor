import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  flags: vi.fn(),
  read: vi.fn(),
}));
vi.mock("@/lib/grove/privateConversationLoop", () => ({
  grovePrivateTurnFeatures: mocks.flags,
}));
vi.mock("@/lib/grove/privateReadBroker", () => ({
  readPrivateGroveConversations: mocks.read,
}));

import { GET } from "@/app/api/grove/chat/conversations/route";

const projectId = "00000000-0000-4000-8000-000000000003";
const conversationId = "00000000-0000-4000-8000-000000000004";
const url = "https://private-grove.example.org/api/grove/chat/conversations";
const req = (query = "projectId=" + projectId) =>
  new Request(url + "?" + query, {
    headers: { Authorization: "Bearer mock-private-owner" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.flags.mockReturnValue({
    chatEnabled: true, modelEnabled: false, transcriptEnabled: false,
    cognitivePreviewEnabled: false,
  });
  mocks.read.mockResolvedValue({
    projectId,
    conversations: [{
      conversationId,
      createdAt: "2026-09-23T00:00:00Z",
      updatedAt: "2026-09-23T01:00:00Z",
    }],
    mayBeTruncated: false,
  });
});

describe("Grove existing-conversation discovery endpoint", () => {
  it("defaults OFF before parsing query or accessing a provider", async () => {
    mocks.flags.mockReturnValueOnce({chatEnabled: false});
    const res = await GET(req("unexpected=1"));
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("rejects extra, duplicated and malformed IDs before provider access", async () => {
    for (const query of [
      "projectId=" + projectId + "&ownerId=other",
      "projectId=" + projectId + "&projectId=" + projectId,
      "projectId=bad-id", "",
    ]) {
      expect((await GET(req(query))).status).toBe(400);
    }
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("returns only existing scoped IDs and no fake ARK execution", async () => {
    const request = req();
    const res = await GET(request);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(mocks.read).toHaveBeenCalledWith(request, projectId);
    expect(await res.json()).toEqual({
      ok: true, projectId,
      conversations: [{
        conversationId,
        createdAt: "2026-09-23T00:00:00Z",
        updatedAt: "2026-09-23T01:00:00Z",
      }],
      mayBeTruncated: false,
      createsConversation: false,
      grantsExecution: false,
    });
  });

  it("does not manufacture a conversation if Firefly project has none", async () => {
    mocks.read.mockResolvedValueOnce({
      projectId, conversations: [], mayBeTruncated: false,
    });
    const res = await GET(req());
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.conversations).toEqual([]);
    expect(j.createsConversation).toBe(false);
  });

  it("does not expose private database or token failures", async () => {
    mocks.read.mockRejectedValueOnce(new Error(
      "private service-role-token and private email",
    ));
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json()))
      .not.toMatch(/service-role-token|private email/);
  });
});

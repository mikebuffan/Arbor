import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  projectOwned: vi.fn(),
  conversationOwned: vi.fn(),
}));

vi.mock("@/lib/auth/requireUser", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mocks.projectOwned,
  assertConversationOwnedByUser: mocks.conversationOwned,
}));

import { GET } from "@/app/api/chat/attachments/grove-list/route";
import { listGroveDocuments, readGroveDocumentQuery } from "@/lib/attachments/groveListing";

const userId = "verified-user";
const projectId = "00000000-0000-4000-8000-000000000002";
const conversationId = "00000000-0000-4000-8000-000000000003";
const otherConversationId = "00000000-0000-4000-8000-000000000004";
const fileId = "00000000-0000-4000-8000-000000000001";

function attachment(id = fileId, conversation = conversationId) {
  return {
    id, user_id: userId, project_id: projectId,
    conversation_id: conversation,
    status: "uploaded", storage_bucket: "chat-attachments",
    storage_path: [userId, projectId, conversation, id, "my-report.pdf"].join("/"),
  };
}

function client(rows: ReturnType<typeof attachment>[]) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const name of ["select", "eq", "is", "order", "gt", "limit"]) {
    query[name] = vi.fn().mockReturnValue(query);
  }
  query.then = vi.fn((resolve) => Promise.resolve({
    data: rows, error: null,
  }).then(resolve));
  return {
    supabase: { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient,
    query,
  };
}

function request(query = "projectId=" + projectId) {
  return new Request("https://arbor.test/api/chat/attachments/grove-list?" + query, {
    headers: {
      authorization: "Bearer verified",
      origin: "https://companion.test",
    },
  });
}

describe("Grove document listing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.projectOwned.mockResolvedValue(undefined);
    mocks.conversationOwned.mockResolvedValue(undefined);
  });

  it("authenticates and returns only scope-verified metadata, not storage paths", async () => {
    const { supabase, query } = client([attachment()]);
    mocks.requireUser.mockResolvedValue({ supabase, userId });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: true, projectId,
      documents: [{ id: fileId, projectId, conversationId, displayName: "my-report.pdf" }],
      nextCursor: null,
    });
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
    expect(query.eq).toHaveBeenCalledWith("project_id", projectId);
    expect(query.eq).toHaveBeenCalledWith("status", "uploaded");
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
    expect(query.limit).toHaveBeenCalledWith(26);
    expect(mocks.projectOwned).toHaveBeenCalledOnce();
    expect(mocks.conversationOwned).toHaveBeenCalledOnce();
  });

  it("requires authentication before validating malformed query", async () => {
    mocks.requireUser.mockRejectedValue(new RouteAccessError(401, "invalid_token"));
    const response = await GET(request("projectId=not-a-uuid"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_token" });
    expect(mocks.projectOwned).not.toHaveBeenCalled();
  });

  it("validates cursor and project UUIDs", async () => {
    expect(readGroveDocumentQuery(new URL("https://arbor.test/?projectId=bad")))
      .toBeNull();
    expect(readGroveDocumentQuery(new URL("https://arbor.test/?projectId=" +
      projectId + "&after=bad"))).toBeNull();
    expect(readGroveDocumentQuery(new URL("https://arbor.test/?projectId=" +
      projectId + "&after=" + fileId))).toEqual({ projectId, after: fileId });
    mocks.requireUser.mockResolvedValue({ supabase: client([]).supabase, userId });
    const response = await GET(request("projectId=not-a-uuid"));
    expect(response.status).toBe(400);
  });

  it("fails closed on foreign project, conversation denial and invalid paths", async () => {
    const foreign = { ...attachment(), project_id: otherConversationId };
    await expect(listGroveDocuments({
      ...{ supabase: client([foreign]).supabase, userId, projectId, after: null },
    })).rejects.toMatchObject({ code: "attachment_not_found" });

    mocks.conversationOwned.mockRejectedValueOnce(
      new RouteAccessError(404, "conversation_not_found"),
    );
    await expect(listGroveDocuments({
      supabase: client([attachment()]).supabase, userId, projectId, after: null,
    })).rejects.toMatchObject({ code: "conversation_not_found" });

    const badPath = { ...attachment(), storage_path: "someone-else/path.pdf" };
    await expect(listGroveDocuments({
      supabase: client([badPath]).supabase, userId, projectId, after: null,
    })).rejects.toMatchObject({ code: "attachment_not_found" });
  });

  it("bounds each page, verifies each distinct conversation, and never leaks the extra row", async () => {
    const ids = Array.from({ length: 26 }, (_, i) =>
      "00000000-0000-4000-8000-" + String(i + 1).padStart(12, "0"));
    const records = ids.map((id, index) =>
      attachment(id, index % 2 ? conversationId : otherConversationId));
    const result = await listGroveDocuments({
      supabase: client(records).supabase, userId, projectId, after: null,
    });
    expect(result.documents).toHaveLength(25);
    expect(result.nextCursor).toBe(ids[24]);
    expect(JSON.stringify(result)).not.toContain("storage_path");
    expect(mocks.conversationOwned).toHaveBeenCalledTimes(2);
    const { supabase, query } = client([]);
    await listGroveDocuments({ supabase, userId, projectId, after: ids[24] });
    expect(query.gt).toHaveBeenCalledWith("id", ids[24]);
  });
});

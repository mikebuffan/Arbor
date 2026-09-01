import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createAttachmentAccess: vi.fn(),
  deleteAttachment: vi.fn(),
}));

vi.mock("@/lib/auth/requireUser", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/attachments/broker", () => ({
  createAttachmentAccess: mocks.createAttachmentAccess,
  deleteAttachment: mocks.deleteAttachment,
}));

import {
  OPTIONS as accessOptions,
  POST as accessPost,
} from "@/app/api/chat/attachments/access/route";
import {
  OPTIONS as deleteOptions,
  POST as deletePost,
} from "@/app/api/chat/attachments/delete/route";

const requestScope = {
  attachmentId: "00000000-0000-4000-8000-000000000001",
  projectId: "00000000-0000-4000-8000-000000000002",
  conversationId: "00000000-0000-4000-8000-000000000003",
};
const userClient = { client: "request-scoped" };

function postRequest(path: string, body: unknown) {
  return new Request(`https://arbor.test${path}`, {
    method: "POST",
    headers: {
      authorization: "Bearer verified-user-token",
      "content-type": "application/json",
      origin: "https://companion.test",
    },
    body: JSON.stringify(body),
  });
}

function expectAttachmentHeaders(response: Response) {
  expect(response.headers.get("access-control-allow-origin")).toBe(
    "https://companion.test",
  );
  expect(response.headers.get("vary")).toBe("origin");
  expect(response.headers.get("access-control-allow-methods")).toBe(
    "POST, OPTIONS",
  );
  expect(response.headers.get("access-control-allow-headers")).toBe(
    "content-type, authorization, apikey, x-client-info",
  );
  expect(response.headers.get("access-control-max-age")).toBe("86400");
  expect(response.headers.get("cache-control")).toBe("no-store");
}

describe("attachment API contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      userId: "verified-user-id",
      supabase: userClient,
    });
  });

  it("returns a transient signed URL without bucket or canonical path fields", async () => {
    mocks.createAttachmentAccess.mockResolvedValue({
      signedUrl: "https://storage.test/transient-signed-url",
      expiresAt: "2026-08-10T12:01:00.000Z",
    });

    const response = await accessPost(
      postRequest("/api/chat/attachments/access", requestScope),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://companion.test",
    );
    expect(body).toEqual({
      ok: true,
      attachmentId: requestScope.attachmentId,
      signedUrl: "https://storage.test/transient-signed-url",
      expiresAt: "2026-08-10T12:01:00.000Z",
    });
    expect(body).not.toHaveProperty("storagePath");
    expect(body).not.toHaveProperty("bucket");
    expect(mocks.createAttachmentAccess).toHaveBeenCalledWith({
      supabase: userClient,
      userId: "verified-user-id",
      ...requestScope,
    });
  });

  it.each([
    ["access", "/api/chat/attachments/access", accessPost],
    ["delete", "/api/chat/attachments/delete", deletePost],
  ])(
    "authenticates before returning invalid_request for malformed %s scope",
    async (_name, path, handler) => {
      const response = await handler(
        postRequest(path, {
          ...requestScope,
          projectId: "not-a-uuid",
        }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        ok: false,
        error: "invalid_request",
      });
      expectAttachmentHeaders(response);
      expect(mocks.requireUser).toHaveBeenCalledOnce();
      expect(mocks.createAttachmentAccess).not.toHaveBeenCalled();
      expect(mocks.deleteAttachment).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["access", "/api/chat/attachments/access", accessPost],
    ["delete", "/api/chat/attachments/delete", deletePost],
  ])(
    "returns the approved 401 response with scoped headers for %s",
    async (_name, path, handler) => {
      mocks.requireUser.mockRejectedValue(
        new RouteAccessError(401, "auth_required"),
      );

      const response = await handler(postRequest(path, requestScope));

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        ok: false,
        error: "invalid_token",
      });
      expectAttachmentHeaders(response);
      expect(mocks.createAttachmentAccess).not.toHaveBeenCalled();
      expect(mocks.deleteAttachment).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["access", "/api/chat/attachments/access", accessPost],
    ["delete", "/api/chat/attachments/delete", deletePost],
  ])(
    "keeps malformed unauthenticated %s requests on the scoped 401 contract",
    async (_name, path, handler) => {
      mocks.requireUser.mockRejectedValue(
        new RouteAccessError(401, "auth_required"),
      );

      const response = await handler(postRequest(path, {}));

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        ok: false,
        error: "invalid_token",
      });
      expectAttachmentHeaders(response);
      expect(mocks.createAttachmentAccess).not.toHaveBeenCalled();
      expect(mocks.deleteAttachment).not.toHaveBeenCalled();
    },
  );

  it("returns one non-enumerating 404 contract for attachment scope denial", async () => {
    mocks.createAttachmentAccess.mockRejectedValue(
      new RouteAccessError(404, "attachment_not_found"),
    );

    const response = await accessPost(
      postRequest("/api/chat/attachments/access", requestScope),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: "attachment_not_found",
    });
  });

  it("never returns raw broker failures", async () => {
    mocks.createAttachmentAccess.mockRejectedValue(
      new Error("signed URL and private provider detail"),
    );

    const response = await accessPost(
      postRequest("/api/chat/attachments/access", requestScope),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: "server_error",
    });
  });

  it("passes the required delete scope and bounded optional reason", async () => {
    mocks.deleteAttachment.mockResolvedValue(undefined);
    const response = await deletePost(
      postRequest("/api/chat/attachments/delete", {
        ...requestScope,
        reason: "user cleanup",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      attachmentId: requestScope.attachmentId,
      deleted: true,
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.deleteAttachment).toHaveBeenCalledWith({
      supabase: userClient,
      userId: "verified-user-id",
      ...requestScope,
      reason: "user cleanup",
    });
  });

  it("rejects an empty or overlong delete reason", async () => {
    for (const reason of ["   ", "x".repeat(241)]) {
      const response = await deletePost(
        postRequest("/api/chat/attachments/delete", {
          ...requestScope,
          reason,
        }),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        ok: false,
        error: "invalid_request",
      });
    }
    expect(mocks.deleteAttachment).not.toHaveBeenCalled();
  });

  it.each([
    ["access", "/api/chat/attachments/access", accessOptions],
    ["delete", "/api/chat/attachments/delete", deleteOptions],
  ])(
    "serves the approved %s CORS preflight without caching",
    async (_name, path, handler) => {
      const response = await handler(
        new Request(`https://arbor.test${path}`, {
          method: "OPTIONS",
          headers: { origin: "https://companion.test" },
        }),
      );

      expect(response.status).toBe(204);
      expectAttachmentHeaders(response);
    },
  );
});

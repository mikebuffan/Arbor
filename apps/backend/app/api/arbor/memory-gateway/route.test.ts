import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  assertProjectOwnedByUser: vi.fn(),
  assertConversationOwnedByUser: vi.fn(),
  routeErrorResponse: vi.fn(),
  buildSnapshot: vi.fn(),
}));

vi.mock("@/lib/auth/requireUser", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mocks.assertProjectOwnedByUser,
  assertConversationOwnedByUser: mocks.assertConversationOwnedByUser,
}));

vi.mock("@/lib/auth/routeAuthorization", () => ({
  routeErrorResponse: mocks.routeErrorResponse,
}));

vi.mock("@/lib/arbor/memoryGateway", () => ({
  buildArborMemoryGatewaySnapshot: mocks.buildSnapshot,
}));

import { POST } from "./route";

const projectId = "11111111-1111-4111-8111-111111111111";
const conversationId = "22222222-2222-4222-8222-222222222222";

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/arbor/memory-gateway", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer test-token",
    },
    body: JSON.stringify(body),
  });
}

describe("memory gateway route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireUser.mockResolvedValue({
      userId: "user-a",
      supabase: { marker: "request-scoped" },
    });

    mocks.assertProjectOwnedByUser.mockResolvedValue(undefined);
    mocks.assertConversationOwnedByUser.mockResolvedValue(undefined);

    mocks.routeErrorResponse.mockImplementation(() =>
      new Response(
        JSON.stringify({
          ok: false,
          error: "access_denied",
        }),
        {
          status: 404,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    mocks.buildSnapshot.mockResolvedValue({
      schemaVersion: 1,
      projectId,
      conversationId,
      activeObjective: null,
      openLoops: [],
      corrections: [],
      exactConversation: null,
      identityAnchors: [],
      relevantMemories: [],
      sensitiveAvailableCount: 0,
      diagnostics: {
        memoryKeysUsed: [],
        exactConversationFound: false,
        projectCorrectionCount: 0,
        projectAgencyFound: false,
      },
    });
  });

  it("checks project and conversation ownership before reading memory", async () => {
    const response = await POST(
      request({
        projectId,
        conversationId,
        query: "what matters now",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.assertProjectOwnedByUser).toHaveBeenCalledWith(
      expect.objectContaining({
        marker: "request-scoped",
      }),
      "user-a",
      projectId,
    );
    expect(mocks.assertConversationOwnedByUser).toHaveBeenCalledWith({
      supabase: expect.objectContaining({
        marker: "request-scoped",
      }),
      userId: "user-a",
      conversationId,
      projectId,
    });
    expect(mocks.buildSnapshot).toHaveBeenCalledTimes(1);
  });

  it("does not invoke the gateway when project ownership fails", async () => {
    mocks.assertProjectOwnedByUser.mockRejectedValueOnce(
      new Error("project_not_found"),
    );

    const response = await POST(
      request({
        projectId,
        conversationId,
        query: "memory",
      }),
    );

    expect(response.status).toBe(404);
    expect(mocks.buildSnapshot).not.toHaveBeenCalled();
    expect(mocks.assertConversationOwnedByUser).not.toHaveBeenCalled();
  });

  it("does not require conversation ownership when no conversation is requested", async () => {
    await POST(
      request({
        projectId,
        query: "project continuity",
      }),
    );

    expect(mocks.assertProjectOwnedByUser).toHaveBeenCalledOnce();
    expect(mocks.assertConversationOwnedByUser).not.toHaveBeenCalled();
    expect(mocks.buildSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-a",
        projectId,
        conversationId: null,
        query: "project continuity",
      }),
    );
  });
});

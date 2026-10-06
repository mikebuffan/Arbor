import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  assertProjectOwnedByUser: vi.fn(),
  readArkProjectSnapshot: vi.fn(),
}));

vi.mock("@/lib/auth/requireUser", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mocks.assertProjectOwnedByUser,
}));
vi.mock("@/lib/ark/readModel", () => ({
  readArkProjectSnapshot: mocks.readArkProjectSnapshot,
}));

import { GET } from "@/app/api/ark/handoff/route";

const projectId = "00000000-0000-4000-8000-000000000002";
const userId = "verified-user";

function request(scope = projectId) {
  return new Request(
    "https://arbor.test/api/ark/handoff?projectId=" + scope,
    { headers: { authorization: "Bearer verified" } },
  );
}

describe("Grove integration of read-only ARK handoff route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      supabase: { user: "scoped-client" },
      userId,
    });
    mocks.assertProjectOwnedByUser.mockResolvedValue(undefined);
    mocks.readArkProjectSnapshot.mockResolvedValue({
      available: true,
      capturedAt: "2026-09-21T20:00:00.000Z",
      objectives: [
        { id: "objective-1", goal: "Finish house", status: "checkpointed" },
      ],
      tasks: [],
      checkpoints: [
        { id: "cp-3", objective_id: "objective-1",
          sequence: 3, next_action: "Review release" },
      ],
      events: [],
    });
  });

  it("authenticates and scopes before returning exact project handoff", async () => {
    const response = await GET(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.assertProjectOwnedByUser).toHaveBeenCalledWith(
      { user: "scoped-client" }, userId, projectId,
    );
    expect(mocks.readArkProjectSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ userId, projectId, objectiveLimit: 20 }),
    );
    expect(body.projectId).toBe(projectId);
    expect(body.handoff.nextAction).toBe("Review release");
    expect(body.handoff.liveExecutionVerified).toBe(false);
  });

  it("requires authentication before validating malformed project ID", async () => {
    mocks.requireUser.mockRejectedValue(
      new RouteAccessError(401, "invalid_token"),
    );
    const response = await GET(request("not-a-uuid"));
    expect(response.status).toBe(401);
    expect(mocks.assertProjectOwnedByUser).not.toHaveBeenCalled();
    expect(mocks.readArkProjectSnapshot).not.toHaveBeenCalled();
  });

  it("rejects unowned projects without ever reading their persisted work", async () => {
    mocks.assertProjectOwnedByUser.mockRejectedValue(
      new RouteAccessError(404, "project_not_found"),
    );
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(mocks.readArkProjectSnapshot).not.toHaveBeenCalled();
  });

  it("invalid project never reaches the backend snapshot reader", async () => {
    const response = await GET(request("wrong"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false, error: "invalid_project_id",
    });
    expect(mocks.readArkProjectSnapshot).not.toHaveBeenCalled();
  });
});

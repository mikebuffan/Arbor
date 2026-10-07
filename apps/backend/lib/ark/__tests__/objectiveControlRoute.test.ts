import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  assertProjectOwnedByUser: vi.fn(),
  supabaseAdmin: vi.fn(),
  cancelObjective: vi.fn(),
  resumeBlockedObjective: vi.fn(),
}));

vi.mock("@/lib/auth/requireUser", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mocks.assertProjectOwnedByUser,
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

vi.mock("../supabaseStore", () => ({
  SupabaseArkStore: class {
    cancelObjective = mocks.cancelObjective;
    resumeBlockedObjective = mocks.resumeBlockedObjective;
  },
}));

import { POST } from "@/app/api/ark/objective-control/route";

const projectId = "00000000-0000-4000-8000-000000000001";
const objectiveId = "00000000-0000-4000-8000-000000000002";
const userId = "00000000-0000-4000-8000-000000000003";
const adminClient = { role: "service" };

function ownedObjectiveClient(found = true) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: found ? { id: objectiveId } : null,
    error: null,
  });
  const eqProject = vi.fn(() => ({ maybeSingle }));
  const eqUser = vi.fn(() => ({ eq: eqProject }));
  const eqId = vi.fn(() => ({ eq: eqUser }));
  const select = vi.fn(() => ({ eq: eqId }));
  const from = vi.fn(() => ({ select }));
  return { from, select, eqId, eqUser, eqProject, maybeSingle };
}

function request(body: unknown) {
  return new Request("https://arbor.test/api/ark/objective-control", {
    method: "POST",
    headers: {
      authorization: "Bearer user-token",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("ARK objective owner controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const scoped = ownedObjectiveClient();
    mocks.requireUser.mockResolvedValue({ userId, supabase: scoped });
    mocks.assertProjectOwnedByUser.mockResolvedValue(undefined);
    mocks.supabaseAdmin.mockReturnValue(adminClient);
  });

  it("authenticates before validating malformed input", async () => {
    mocks.requireUser.mockRejectedValue(
      new RouteAccessError(401, "invalid_token"),
    );

    const response = await POST(request({}));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid_token",
    });
    expect(mocks.assertProjectOwnedByUser).not.toHaveBeenCalled();
    expect(mocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("rejects malformed authenticated controls before privileged access", async () => {
    const response = await POST(request({
      projectId,
      objectiveId: "not-a-uuid",
      action: "cancel",
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid_request",
    });
    expect(mocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("proves user/project/objective scope before durable STOP", async () => {
    mocks.cancelObjective.mockResolvedValue({
      id: objectiveId,
      status: "cancelled",
    });

    const response = await POST(request({
      projectId,
      objectiveId,
      action: "cancel",
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      projectId,
      objectiveId,
      action: "cancel",
      status: "cancelled",
    });
    expect(mocks.assertProjectOwnedByUser).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      projectId,
    );
    expect(mocks.supabaseAdmin).toHaveBeenCalledOnce();
    expect(mocks.cancelObjective).toHaveBeenCalledWith({
      objectiveId,
      now: expect.any(String),
    });
    expect(mocks.resumeBlockedObjective).not.toHaveBeenCalled();
  });

  it("uses the same exact-owner boundary for explicit blocked resume", async () => {
    mocks.resumeBlockedObjective.mockResolvedValue({
      id: objectiveId,
      status: "queued",
    });

    const response = await POST(request({
      projectId,
      objectiveId,
      action: "resume",
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      projectId,
      objectiveId,
      action: "resume",
      status: "queued",
    });
    expect(mocks.resumeBlockedObjective).toHaveBeenCalledWith({
      objectiveId,
      now: expect.any(String),
    });
    expect(mocks.cancelObjective).not.toHaveBeenCalled();
  });

  it("does not acquire a privileged client for an objective outside user scope", async () => {
    const scoped = ownedObjectiveClient(false);
    mocks.requireUser.mockResolvedValue({ userId, supabase: scoped });

    const response = await POST(request({
      projectId,
      objectiveId,
      action: "cancel",
    }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: "ark_objective_not_found",
    });
    expect(mocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("returns a bounded conflict instead of exposing database details", async () => {
    mocks.cancelObjective.mockRejectedValue(
      new Error("rpc failed: ark_completed_objective_cannot_cancel internal detail"),
    );

    const response = await POST(request({
      projectId,
      objectiveId,
      action: "cancel",
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "ark_completed_objective_cannot_cancel",
    });
  });

  it("maps non-resumable objective state to an explicit conflict", async () => {
    mocks.resumeBlockedObjective.mockRejectedValue(
      { message: "ark_objective_not_blocked" },
    );

    const response = await POST(request({
      projectId,
      objectiveId,
      action: "resume",
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "ark_objective_not_blocked",
    });
  });
});

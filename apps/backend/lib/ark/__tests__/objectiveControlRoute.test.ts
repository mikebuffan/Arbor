import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  controlOwnedArkObjective: vi.fn(),
}));

vi.mock("@/lib/auth/requireUser", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/ark/objectiveControlService", () => ({
  controlOwnedArkObjective: mocks.controlOwnedArkObjective,
}));

import { POST } from "@/app/api/ark/objective-control/route";

const projectId = "00000000-0000-4000-8000-000000000001";
const objectiveId = "00000000-0000-4000-8000-000000000002";
const userId = "00000000-0000-4000-8000-000000000003";
const scopedClient = { scope: "user" };

function request(body: unknown) {
  return new Request(
    "https://arbor.test/api/ark/objective-control",
    {
      method: "POST",
      headers: {
        authorization: "Bearer user-token",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

describe("ARK objective owner control route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ARBOR_ENABLE_ARK_OBJECTIVE_CONTROL", "true");
    mocks.requireUser.mockResolvedValue({
      userId,
      supabase: scopedClient,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps owner mutation controls default-off", async () => {
    vi.stubEnv("ARBOR_ENABLE_ARK_OBJECTIVE_CONTROL", "false");

    const response = await POST(
      request({ projectId, objectiveId, action: "cancel" }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: "ark_objective_control_not_enabled",
    });
    expect(mocks.controlOwnedArkObjective).not.toHaveBeenCalled();
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
    expect(mocks.controlOwnedArkObjective).not.toHaveBeenCalled();
  });

  it("rejects malformed authenticated controls before broker access", async () => {
    const response = await POST(
      request({
        projectId,
        objectiveId: "not-a-uuid",
        action: "cancel",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid_request",
    });
    expect(mocks.controlOwnedArkObjective).not.toHaveBeenCalled();
  });

  it("delegates STOP only through the scoped server broker", async () => {
    mocks.controlOwnedArkObjective.mockResolvedValue({
      id: objectiveId,
      userId,
      projectId,
      status: "cancelled",
    });

    const response = await POST(
      request({ projectId, objectiveId, action: "cancel" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      projectId,
      objectiveId,
      action: "cancel",
      status: "cancelled",
    });
    expect(mocks.controlOwnedArkObjective).toHaveBeenCalledWith({
      supabase: scopedClient,
      userId,
      projectId,
      objectiveId,
      action: "cancel",
    });
  });

  it("uses the same broker boundary for explicit blocked resume", async () => {
    mocks.controlOwnedArkObjective.mockResolvedValue({
      id: objectiveId,
      userId,
      projectId,
      status: "queued",
    });

    const response = await POST(
      request({ projectId, objectiveId, action: "resume" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      projectId,
      objectiveId,
      action: "resume",
      status: "queued",
    });
  });

  it("maps an out-of-scope objective to a bounded not-found response", async () => {
    mocks.controlOwnedArkObjective.mockRejectedValue(
      new Error("ark_objective_not_found"),
    );

    const response = await POST(
      request({ projectId, objectiveId, action: "cancel" }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: "ark_objective_not_found",
    });
  });

  it("returns a bounded conflict instead of database details", async () => {
    mocks.controlOwnedArkObjective.mockRejectedValue(
      new Error(
        "rpc failed: ark_completed_objective_cannot_cancel internal detail",
      ),
    );

    const response = await POST(
      request({ projectId, objectiveId, action: "cancel" }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "ark_completed_objective_cannot_cancel",
    });
  });

  it("maps non-resumable objective state to an explicit conflict", async () => {
    mocks.controlOwnedArkObjective.mockRejectedValue({
      message: "ark_objective_not_blocked",
    });

    const response = await POST(
      request({ projectId, objectiveId, action: "resume" }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "ark_objective_not_blocked",
    });
  });
});

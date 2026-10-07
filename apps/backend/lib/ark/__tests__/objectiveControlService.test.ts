import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  assertProjectOwnedByUser: vi.fn(),
  supabaseAdmin: vi.fn(),
  cancelObjective: vi.fn(),
  resumeBlockedObjective: vi.fn(),
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

import { controlOwnedArkObjective } from "../objectiveControlService";

const projectId = "00000000-0000-4000-8000-000000000001";
const objectiveId = "00000000-0000-4000-8000-000000000002";
const userId = "00000000-0000-4000-8000-000000000003";
const privilegedClient = { scope: "service" };

function scopedObjectiveClient(found = true) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: found
      ? {
          id: objectiveId,
          user_id: userId,
          project_id: projectId,
          status: "queued",
        }
      : null,
    error: null,
  });
  const eqProject = vi.fn(() => ({ maybeSingle }));
  const eqUser = vi.fn(() => ({ eq: eqProject }));
  const eqId = vi.fn(() => ({ eq: eqUser }));
  const select = vi.fn(() => ({ eq: eqId }));
  const from = vi.fn(() => ({ select }));
  return {
    from,
    select,
    eqId,
    eqUser,
    eqProject,
    maybeSingle,
  };
}

describe("ARK privileged objective-control broker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertProjectOwnedByUser.mockResolvedValue(undefined);
    mocks.supabaseAdmin.mockReturnValue(privilegedClient);
  });

  it("does not acquire privileged authority when project ownership fails", async () => {
    const supabase = scopedObjectiveClient();
    mocks.assertProjectOwnedByUser.mockRejectedValue(
      new Error("project_not_found"),
    );

    await expect(
      controlOwnedArkObjective({
        supabase: supabase as never,
        userId,
        projectId,
        objectiveId,
        action: "cancel",
      }),
    ).rejects.toThrow("project_not_found");

    expect(mocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("does not acquire privileged authority for an out-of-scope objective", async () => {
    const supabase = scopedObjectiveClient(false);

    await expect(
      controlOwnedArkObjective({
        supabase: supabase as never,
        userId,
        projectId,
        objectiveId,
        action: "cancel",
      }),
    ).rejects.toThrow("ark_objective_not_found");

    expect(mocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("acquires service authority only after exact owner scope and executes STOP", async () => {
    const supabase = scopedObjectiveClient();
    mocks.cancelObjective.mockResolvedValue({
      id: objectiveId,
      userId,
      projectId,
      status: "cancelled",
    });

    const result = await controlOwnedArkObjective({
      supabase: supabase as never,
      userId,
      projectId,
      objectiveId,
      action: "cancel",
      now: "2026-10-07T00:00:00.000Z",
    });

    expect(mocks.assertProjectOwnedByUser).toHaveBeenCalledWith(
      supabase,
      userId,
      projectId,
    );
    expect(supabase.maybeSingle).toHaveBeenCalled();
    expect(mocks.supabaseAdmin).toHaveBeenCalledOnce();
    expect(mocks.cancelObjective).toHaveBeenCalledWith({
      objectiveId,
      now: "2026-10-07T00:00:00.000Z",
    });
    expect(result.status).toBe("cancelled");
  });

  it("uses the same verified boundary for blocked resume", async () => {
    const supabase = scopedObjectiveClient();
    mocks.resumeBlockedObjective.mockResolvedValue({
      id: objectiveId,
      userId,
      projectId,
      status: "queued",
    });

    const result = await controlOwnedArkObjective({
      supabase: supabase as never,
      userId,
      projectId,
      objectiveId,
      action: "resume",
    });

    expect(mocks.supabaseAdmin).toHaveBeenCalledOnce();
    expect(mocks.resumeBlockedObjective).toHaveBeenCalledOnce();
    expect(result.status).toBe("queued");
  });

  it("rejects a privileged RPC result that escapes the proven scope", async () => {
    const supabase = scopedObjectiveClient();
    mocks.cancelObjective.mockResolvedValue({
      id: objectiveId,
      userId: "00000000-0000-4000-8000-000000000099",
      projectId,
      status: "cancelled",
    });

    await expect(
      controlOwnedArkObjective({
        supabase: supabase as never,
        userId,
        projectId,
        objectiveId,
        action: "cancel",
      }),
    ).rejects.toThrow("ark_objective_control_scope_mismatch");
  });
});

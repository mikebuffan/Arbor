import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  owner: vi.fn(),
  admin: vi.fn(),
  cancel: vi.fn(),
  resume: vi.fn(),
}));

vi.mock("../context", () => ({ arkMcpUserContext: mocks.context }));
vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mocks.owner,
}));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: mocks.admin }));
vi.mock("@/lib/ark/supabaseStore", () => ({
  SupabaseArkStore: class {
    cancelObjective = mocks.cancel;
    resumeBlockedObjective = mocks.resume;
  },
}));

import { registerArkTaskTools } from "../registerArkTaskTools";
import {
  ARK_OBJECTIVE_CONTROL_PERMISSION,
  arkObjectiveControlProjects,
} from "../taskPermissions";

const project = "11111111-1111-4111-8111-111111111111";
const otherProject = "22222222-2222-4222-8222-222222222222";
const user = "33333333-3333-4333-8333-333333333333";
const objective = "44444444-4444-4444-8444-444444444444";

const ctx = {
  http: {
    authInfo: {
      token: "validated",
      clientId: "approved-client",
      scopes: ["ark.read", ARK_OBJECTIVE_CONTROL_PERMISSION],
      extra: {
        userId: user,
        arkObjectiveControlProjectIds: [project],
      },
    },
  },
};

function tools() {
  const registerTool = vi.fn();
  registerArkTaskTools({ registerTool } as never);
  return registerTool.mock.calls;
}

function controlTool() {
  const call = tools().find((entry) => entry[0] === "control_ark_objective");
  if (!call) throw new Error("missing control tool");
  return { config: call[1], run: call[2] };
}

function client(data: unknown) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
  };
  q.select.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  return { from: vi.fn(() => q), q };
}

describe("ARK MCP objective-control boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ARBOR_ENABLE_ARK_MCP_SUBMISSION", "false");
    vi.stubEnv("ARBOR_ENABLE_ARK_MCP_OBJECTIVE_CONTROL", "true");
    mocks.owner.mockResolvedValue(undefined);
    mocks.admin.mockReturnValue({ role: "service" });
  });

  it("registers objective control without granting read-task submission", () => {
    const calls = tools();
    expect(calls.map((entry) => entry[0])).toContain("control_ark_objective");
    expect(calls.map((entry) => entry[0])).not.toContain("submit_ark_read_task");
    expect(controlTool().config.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    });
  });

  it("keeps the control tool absent unless its own exact-true switch is enabled", () => {
    vi.stubEnv("ARBOR_ENABLE_ARK_MCP_OBJECTIVE_CONTROL", "false");
    expect(tools().map((entry) => entry[0])).not.toContain("control_ark_objective");
  });

  it("rechecks activation at execution after discovery", async () => {
    const { run } = controlTool();
    vi.stubEnv("ARBOR_ENABLE_ARK_MCP_OBJECTIVE_CONTROL", "false");
    await expect(run(
      { projectId: project, objectiveId: objective, action: "cancel" },
      ctx,
    )).rejects.toThrow("disabled");
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("rejects a missing client/project control grant before privileged access", async () => {
    const ungranted = {
      http: {
        authInfo: {
          ...ctx.http.authInfo,
          scopes: ["ark.read"],
          extra: { userId: user },
        },
      },
    };
    await expect(controlTool().run(
      { projectId: project, objectiveId: objective, action: "cancel" },
      ungranted,
    )).rejects.toThrow("not_granted");
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("rejects a project outside the control grant", async () => {
    await expect(controlTool().run(
      { projectId: otherProject, objectiveId: objective, action: "cancel" },
      ctx,
    )).rejects.toThrow("not_granted");
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("requires user-scoped project and objective ownership before STOP", async () => {
    const scoped = client({
      id: objective,
      user_id: user,
      project_id: project,
      status: "running",
    });
    mocks.context.mockReturnValue({ userId: user, supabase: scoped });
    mocks.cancel.mockResolvedValue({
      id: objective,
      userId: user,
      projectId: project,
      status: "cancelled",
    });

    const result = await controlTool().run(
      { projectId: project, objectiveId: objective, action: "cancel" },
      ctx,
    );

    expect(mocks.owner).toHaveBeenCalledWith(scoped, user, project);
    expect(scoped.q.eq).toHaveBeenCalledWith("id", objective);
    expect(scoped.q.eq).toHaveBeenCalledWith("user_id", user);
    expect(scoped.q.eq).toHaveBeenCalledWith("project_id", project);
    expect(mocks.owner.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.admin.mock.invocationCallOrder[0]);
    expect(mocks.cancel).toHaveBeenCalledWith({
      objectiveId: objective,
      now: expect.any(String),
    });
    expect(result.structuredContent).toMatchObject({
      projectId: project,
      objectiveId: objective,
      action: "cancel",
      status: "cancelled",
      controlled: true,
    });
  });

  it("resumes only through the same separately granted boundary", async () => {
    const scoped = client({
      id: objective,
      user_id: user,
      project_id: project,
      status: "blocked",
    });
    mocks.context.mockReturnValue({ userId: user, supabase: scoped });
    mocks.resume.mockResolvedValue({
      id: objective,
      userId: user,
      projectId: project,
      status: "queued",
    });

    const result = await controlTool().run(
      { projectId: project, objectiveId: objective, action: "resume" },
      ctx,
    );

    expect(mocks.resume).toHaveBeenCalledWith({
      objectiveId: objective,
      now: expect.any(String),
    });
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(result.structuredContent).toMatchObject({
      action: "resume",
      status: "queued",
      controlled: true,
    });
  });

  it("does not acquire service authority for a foreign objective", async () => {
    mocks.context.mockReturnValue({ userId: user, supabase: client(null) });

    await expect(controlTool().run(
      { projectId: project, objectiveId: objective, action: "cancel" },
      ctx,
    )).rejects.toThrow("ark_objective_not_found");

    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  it("does not expose raw privileged database failures", async () => {
    mocks.context.mockReturnValue({
      userId: user,
      supabase: client({
        id: objective,
        user_id: user,
        project_id: project,
        status: "running",
      }),
    });
    mocks.cancel.mockRejectedValue(
      new Error("provider secret table detail and internal SQL"),
    );

    await expect(controlTool().run(
      { projectId: project, objectiveId: objective, action: "cancel" },
      ctx,
    )).rejects.toThrow("ark_objective_control_failed");
  });

  it("preserves only known bounded conflict codes", async () => {
    mocks.context.mockReturnValue({
      userId: user,
      supabase: client({
        id: objective,
        user_id: user,
        project_id: project,
        status: "completed",
      }),
    });
    mocks.cancel.mockRejectedValue(
      new Error("rpc: ark_completed_objective_cannot_cancel internal detail"),
    );

    await expect(controlTool().run(
      { projectId: project, objectiveId: objective, action: "cancel" },
      ctx,
    )).rejects.toThrow(/^ark_completed_objective_cannot_cancel$/);
  });

  it("rejects a privileged control result that crosses scope", async () => {
    mocks.context.mockReturnValue({
      userId: user,
      supabase: client({
        id: objective,
        user_id: user,
        project_id: project,
        status: "running",
      }),
    });
    mocks.cancel.mockResolvedValue({
      id: objective,
      userId: user,
      projectId: otherProject,
      status: "cancelled",
    });

    await expect(controlTool().run(
      { projectId: project, objectiveId: objective, action: "cancel" },
      ctx,
    )).rejects.toThrow("scope_mismatch");
  });

  it("derives project control only from a matching server-owned client grant", () => {
    const grant = {
      arbor_ark_mcp: {
        client_ids: ["approved-client"],
        project_ids: [project, project, "bad-id"],
        permissions: [ARK_OBJECTIVE_CONTROL_PERMISSION],
      },
    };
    expect(arkObjectiveControlProjects(grant, "approved-client")).toEqual([project]);
    expect(arkObjectiveControlProjects(grant, "other-client")).toEqual([]);
    expect(arkObjectiveControlProjects({
      arbor_ark_mcp: { ...grant.arbor_ark_mcp, permissions: [] },
    }, "approved-client")).toEqual([]);
  });
});

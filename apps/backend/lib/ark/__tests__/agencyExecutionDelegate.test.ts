import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
}));

vi.mock("../agencyDispatcher", () => ({
  dispatchAgencyToolThroughArk: mocks.dispatch,
}));

import { buildArkAgencyExecutionDelegate } from "../agencyExecutionDelegate";

const context = {
  userId: "user-1",
  projectId: "project-1",
  conversationId: "conversation-1",
  turnId: "turn-1",
};

const tool = {
  name: "state.inspect",
  description: "inspect",
  parameters: {},
  risk: "read" as const,
  execute: vi.fn(),
};

describe("ARK agency execution delegate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a normal agency success from a completed ARK task", async () => {
    mocks.dispatch.mockResolvedValue({
      status: "completed",
      objectiveId: "objective-1",
      output: { value: 42 },
      attempts: 1,
      replayed: false,
    });

    const delegate = buildArkAgencyExecutionDelegate({
      arkSupabase: {} as never,
      toolSupabase: {} as never,
      goal: "inspect state",
    });

    const result = await delegate.execute({
      tool,
      args: { scope: "project" },
      context,
      attemptedRoutes: [],
    });

    expect(result).toMatchObject({
      kind: "outcome",
      outcome: {
        ok: true,
        result: { value: 42 },
      },
    });
    expect(mocks.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        goal: "inspect state",
        capability: "state.inspect",
        actionId: "execute",
      }),
    );
  });

  it("checkpoints the planner when ARK still owns unfinished work", async () => {
    mocks.dispatch.mockResolvedValue({
      status: "checkpointed",
      objectiveId: "objective-1",
      taskStatus: "checkpointed",
    });

    const delegate = buildArkAgencyExecutionDelegate({
      arkSupabase: {} as never,
      toolSupabase: {} as never,
      goal: "inspect state",
    });

    const result = await delegate.execute({
      tool,
      args: {},
      context,
      attemptedRoutes: [],
    });

    expect(result).toMatchObject({
      kind: "checkpointed",
      objectiveId: "objective-1",
    });
  });

  it("refuses to start a second action while a prior durable action is unresolved", async () => {
    const delegate = buildArkAgencyExecutionDelegate({
      arkSupabase: {} as never,
      toolSupabase: {} as never,
      goal: "finish",
      canDispatch: () => ({
        allowed: false,
        reason: "prior action still owned",
      }),
    });

    const result = await delegate.execute({
      tool,
      args: {},
      context,
      attemptedRoutes: [],
    });

    expect(result).toEqual({
      kind: "checkpointed",
      reason: "prior action still owned",
    });
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it("treats an in-progress idempotent write as a checkpoint, never a replay", async () => {
    mocks.dispatch.mockResolvedValue({
      status: "blocked",
      objectiveId: "objective-1",
      blocker: {
        kind: "operation_in_progress",
        message: "owned",
      },
    });

    const delegate = buildArkAgencyExecutionDelegate({
      arkSupabase: {} as never,
      toolSupabase: {} as never,
      goal: "persist state",
    });

    const result = await delegate.execute({
      tool: { ...tool, name: "state.write", risk: "reversible_write" as const },
      args: { value: 1 },
      context,
      attemptedRoutes: [],
    });

    expect(result.kind).toBe("checkpointed");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueue: vi.fn(),
  run: vi.fn(),
}));

vi.mock("../agencyBridge", () => ({
  enqueueArkAgencyToolPlan: mocks.enqueue,
}));

vi.mock("../defaultWorker", () => ({
  runDefaultArkWorkerCycle: mocks.run,
}));

import { dispatchAgencyToolThroughArk } from "../agencyDispatcher";

function client(row: Record<string, unknown> | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const eqTask = vi.fn(() => ({ maybeSingle }));
  const eqObjective = vi.fn(() => ({ eq: eqTask }));
  const select = vi.fn(() => ({ eq: eqObjective }));
  return {
    supabase: { from: vi.fn(() => ({ select })) } as never,
    maybeSingle,
  };
}

describe("ARK agency dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enqueue.mockResolvedValue({ id: "objective-1" });
    mocks.run.mockResolvedValue({ status: "completed" });
  });

  it("targets only the objective it just enqueued and returns tool output", async () => {
    const { supabase } = client({
      status: "completed",
      result: {
        output: { value: 42 },
        attempts: 1,
        verified: true,
      },
      attempt_count: 1,
    });

    const result = await dispatchAgencyToolThroughArk({
      arkSupabase: supabase,
      toolSupabase: {} as never,
      userId: "user-1",
      projectId: "project-1",
      conversationId: "conversation-1",
      turnId: "turn-1",
      goal: "finish the work",
      planId: "plan-1",
      actionId: "step-1",
      capability: "state.inspect",
      arguments: { scope: "project" },
    });

    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "plan-1",
        steps: [
          expect.objectContaining({
            id: "step-1",
            capability: "state.inspect",
          }),
        ],
      }),
    );
    expect(mocks.run).toHaveBeenCalledWith(
      expect.objectContaining({
        objectiveId: "objective-1",
        maxTasks: 1,
      }),
    );
    expect(result).toEqual({
      status: "completed",
      objectiveId: "objective-1",
      output: { value: 42 },
      attempts: 1,
      replayed: false,
    });
  });

  it("preserves a durable checkpoint instead of pretending work completed", async () => {
    const { supabase } = client({
      status: "checkpointed",
      result: null,
      attempt_count: 1,
    });

    const result = await dispatchAgencyToolThroughArk({
      arkSupabase: supabase,
      toolSupabase: {} as never,
      userId: "user-1",
      projectId: "project-1",
      turnId: "turn-1",
      goal: "finish the work",
      planId: "plan-1",
      actionId: "step-1",
      capability: "state.inspect",
      arguments: {},
    });

    expect(result).toEqual({
      status: "checkpointed",
      objectiveId: "objective-1",
      taskStatus: "checkpointed",
    });
  });

  it("surfaces ARK blockers without rerunning the selected action", async () => {
    const { supabase } = client({
      status: "blocked",
      result: {
        blocker: {
          kind: "operation_in_progress",
          message: "write already owned",
        },
      },
      attempt_count: 1,
    });

    const result = await dispatchAgencyToolThroughArk({
      arkSupabase: supabase,
      toolSupabase: {} as never,
      userId: "user-1",
      projectId: "project-1",
      turnId: "turn-1",
      goal: "finish the work",
      planId: "plan-1",
      actionId: "step-1",
      capability: "state.write",
      arguments: {},
    });

    expect(result).toMatchObject({
      status: "blocked",
      objectiveId: "objective-1",
      blocker: { kind: "operation_in_progress" },
    });
  });
});

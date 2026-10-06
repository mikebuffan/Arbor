import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  grovePrivateArkExecutionEnabled,
  runPrivateGroveArkObjective,
} from "../privateArkObjectiveRun";

const ids = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
  "00000000-0000-4000-8000-000000000005",
  "00000000-0000-4000-8000-000000000006",
];
const [groveUserId, fireflyUserId, projectId, conversationId, objectiveId, requestId] = ids;

const request = new Request("https://grove.example.org/api/grove/ark/run", {
  method: "POST",
});

const bound = {
  groveUserId,
  fireflyUserId,
  projectId,
  conversationId,
  access: "read-only" as const,
  groveAdmin: {} as never,
  fireflyAdmin: {} as never,
};

function selection(status: string, result: unknown = null) {
  return {
    objective: {
      id: objectiveId,
      userId: fireflyUserId,
      projectId,
      status: status === "completed" ? "completed" : "running",
      goal: "Finish one bounded ARK task",
    },
    task: {
      id: "00000000-0000-4000-8000-000000000007",
      objectiveId,
      userId: fireflyUserId,
      projectId,
      kind: "arbor.agency-tool",
      status,
      result,
      lastError: null,
      attemptCount: status === "completed" ? 1 : 0,
    },
  };
}

describe("bounded private Grove ARK objective run", () => {
  const authorize = vi.fn();
  const readSelection = vi.fn();
  const runWorker = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    authorize.mockResolvedValue(bound);
    runWorker.mockResolvedValue({
      status: "completed",
      claimed: 1,
      completed: 1,
      checkpointed: 0,
      blocked: 0,
      failed: 0,
      verifiedObjectives: 1,
    });
  });

  it("requires all existing ARK gates plus the separate Grove gate", () => {
    const enabled = {
      GROVE_PRIVATE_ARK_EXECUTION_ENABLED: "true",
      ARBOR_ARK_ENABLE_LIVE_EXECUTION: "true",
      ARBOR_ENABLE_ARK_EXECUTION: "true",
      ARBOR_ENABLE_ARK_CHAT_EXECUTION: "true",
    };
    expect(grovePrivateArkExecutionEnabled(enabled)).toBe(true);
    for (const key of Object.keys(enabled)) {
      expect(grovePrivateArkExecutionEnabled({
        ...enabled,
        [key]: "false",
      })).toBe(false);
    }
  });

  it("runs exactly one selected objective task and reads durable result back", async () => {
    readSelection
      .mockResolvedValueOnce(selection("queued"))
      .mockResolvedValueOnce(selection("completed", {
        verified: true,
        output: { value: 42 },
      }));

    const result = await runPrivateGroveArkObjective({
      request,
      projectId,
      conversationId,
      objectiveId,
      requestId,
      dependencies: { authorize, readSelection, runWorker },
    });

    expect(runWorker).toHaveBeenCalledTimes(1);
    expect(runWorker).toHaveBeenCalledWith(expect.objectContaining({
      objectiveId,
      maxTasks: 1,
      maxRuntimeMs: 20_000,
      workerId: `grove:${requestId}`,
    }));
    expect(result).toMatchObject({
      objectiveId,
      taskStatus: "completed",
      completed: true,
      replayed: false,
      verifiesObjectiveCompletion: false,
    });
    expect(JSON.parse(result.resultJson!)).toEqual({
      verified: true,
      output: { value: 42 },
    });
  });

  it("replays an already terminal one-task receipt without executing again", async () => {
    readSelection.mockResolvedValue(selection("completed", {
      verified: true,
      output: "stored",
    }));

    const result = await runPrivateGroveArkObjective({
      request,
      projectId,
      conversationId,
      objectiveId,
      requestId,
      dependencies: { authorize, readSelection, runWorker },
    });

    expect(runWorker).not.toHaveBeenCalled();
    expect(result.replayed).toBe(true);
    expect(result.completed).toBe(true);
  });

  it("does not race a task already marked running", async () => {
    readSelection.mockResolvedValue(selection("running"));
    await expect(runPrivateGroveArkObjective({
      request,
      projectId,
      conversationId,
      objectiveId,
      requestId,
      dependencies: { authorize, readSelection, runWorker },
    })).rejects.toThrow("grove_ark_task_in_progress");
    expect(runWorker).not.toHaveBeenCalled();
  });

  it("rechecks authorization before and after execution", async () => {
    readSelection.mockResolvedValue(selection("queued"));
    authorize
      .mockResolvedValueOnce(bound)
      .mockResolvedValueOnce({
        ...bound,
        fireflyUserId:
          "00000000-0000-4000-8000-000000000099",
      });

    await expect(runPrivateGroveArkObjective({
      request,
      projectId,
      conversationId,
      objectiveId,
      requestId,
      dependencies: { authorize, readSelection, runWorker },
    })).rejects.toThrow("grove_ark_execution_access_changed");
    expect(runWorker).not.toHaveBeenCalled();
  });
});

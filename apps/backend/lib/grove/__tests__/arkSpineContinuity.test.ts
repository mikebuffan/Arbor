import { describe, expect, it, vi } from "vitest";
import { withRuntimeGoal } from "../privateRuntimeGoalWrite";
import { withCapturedRuntimeTurn } from "../privateRuntimeTurnCapture";
import { buildArkHandoff } from "@/lib/ark/handoff";
import { runPrivateGroveArkObjective } from "../privateArkObjectiveRun";
import type { ArborRuntimeState } from "@/lib/arbor/runtime/runtimeState";
import type { ArkReadSnapshot } from "@/lib/ark/readModel";

const ids = {
  groveUserId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
  projectId: "00000000-0000-4000-8000-000000000003",
  conversationId: "00000000-0000-4000-8000-000000000004",
  objectiveId: "00000000-0000-4000-8000-000000000005",
  taskId: "00000000-0000-4000-8000-000000000006",
  requestId: "00000000-0000-4000-8000-000000000007",
};

function snapshot(taskStatus: string): ArkReadSnapshot {
  return {
    available: true,
    capturedAt: "2026-10-06T18:00:00.000Z",
    objectives: [{
      id: ids.objectiveId,
      goal: "Finish the ARK spine",
      status: taskStatus === "completed" ? "completed" : "checkpointed",
      completion_evidence:
        taskStatus === "completed" ? { verifier: "recorded" } : null,
      updated_at: "2026-10-06T18:00:00.000Z",
    }],
    tasks: [{
      id: ids.taskId,
      objective_id: ids.objectiveId,
      status: taskStatus,
      description: "Run one bounded acceptance step",
    }],
    checkpoints: taskStatus === "completed" ? [] : [{
      id: "checkpoint-1",
      objective_id: ids.objectiveId,
      sequence: 1,
      next_action: "Resume bounded acceptance",
      reason: "restart",
      created_at: "2026-10-06T17:59:00.000Z",
    }],
    events: [],
  };
}

describe("One Arbor ARK spine continuity composition", () => {
  it("preserves a goal and verified turn across a synthetic restart without a second state engine", () => {
    const first = withRuntimeGoal({
      prior: null,
      userId: ids.userId,
      projectId: ids.projectId,
      conversationId: ids.conversationId,
      goal: "Finish the ARK spine",
      now: "2026-10-06T17:00:00.000Z",
    });

    const captured = withCapturedRuntimeTurn({
      prior: first,
      userId: ids.userId,
      projectId: ids.projectId,
      conversationId: ids.conversationId,
      userText: "Keep going",
      arborText: "Continuing the same objective.",
      now: "2026-10-06T17:05:00.000Z",
    });

    const reopened = structuredClone(captured) as ArborRuntimeState;
    expect(reopened.currentGoal).toBe("Finish the ARK spine");
    expect(reopened.lastMeaningfulUserTurn).toBe("Keep going");
    expect(reopened.lastMeaningfulArborTurn)
      .toBe("Continuing the same objective.");
    expect(reopened.userId).toBe(ids.userId);
    expect(reopened.projectId).toBe(ids.projectId);
    expect(reopened.conversationId).toBe(ids.conversationId);
  });

  it("selects the persisted checkpoint as read-only handoff and never labels it live execution", () => {
    const handoff = buildArkHandoff(snapshot("checkpointed"));
    expect(handoff.objective?.id).toBe(ids.objectiveId);
    expect(handoff.nextAction).toBe("Resume bounded acceptance");
    expect(handoff.checkpoint?.sequence).toBe(1);
    expect(handoff.liveExecutionVerified).toBe(false);
    expect(handoff.completionEvidenceRecorded).toBe(false);
  });

  it("runs only the approved objective once, then replays its terminal receipt after restart", async () => {
    const authorize = vi.fn(async () => ({
      groveUserId: ids.groveUserId,
      fireflyUserId: ids.userId,
      projectId: ids.projectId,
      conversationId: ids.conversationId,
      access: "read-only" as const,
      groveAdmin: {} as never,
      fireflyAdmin: {} as never,
    }));
    const queued = {
      objective: {
        id: ids.objectiveId,
        userId: ids.userId,
        projectId: ids.projectId,
        status: "queued",
        goal: "Finish the ARK spine",
      },
      task: {
        id: ids.taskId,
        objectiveId: ids.objectiveId,
        userId: ids.userId,
        projectId: ids.projectId,
        kind: "arbor.agency-tool",
        status: "checkpointed",
        result: null,
        lastError: null,
        attemptCount: 1,
      },
    };
    const completed = {
      ...queued,
      objective: { ...queued.objective, status: "completed" },
      task: {
        ...queued.task,
        status: "completed",
        result: { verified: true, output: { receipt: "durable" } },
      },
    };
    const readSelection = vi.fn()
      .mockResolvedValueOnce(queued)
      .mockResolvedValueOnce(completed);
    const runWorker = vi.fn(async () => ({
      status: "completed" as const,
      claimed: 1,
      completed: 1,
      checkpointed: 0,
      blocked: 0,
      failed: 0,
      verifiedObjectives: 1,
    }));

    const input = {
      request: new Request("https://grove.example.org/api/grove/ark/run"),
      projectId: ids.projectId,
      conversationId: ids.conversationId,
      objectiveId: ids.objectiveId,
      requestId: ids.requestId,
      dependencies: {
        authorize: authorize as never,
        readSelection: readSelection as never,
        runWorker: runWorker as never,
      },
    };

    const first = await runPrivateGroveArkObjective(input);
    expect(first).toMatchObject({
      objectiveId: ids.objectiveId,
      taskId: ids.taskId,
      taskStatus: "completed",
      completed: true,
      replayed: false,
      verifiesObjectiveCompletion: false,
    });
    expect(runWorker).toHaveBeenCalledTimes(1);

    readSelection.mockReset();
    readSelection.mockResolvedValue(completed);
    const replay = await runPrivateGroveArkObjective(input);
    expect(replay).toMatchObject({
      taskStatus: "completed",
      completed: true,
      replayed: true,
    });
    expect(runWorker).toHaveBeenCalledTimes(1);
  });

  it("does not resurrect a completed objective as an active next action", () => {
    const handoff = buildArkHandoff(snapshot("completed"));
    expect(handoff.objective?.status).toBe("completed");
    expect(handoff.nextAction).toBeNull();
    expect(handoff.completionEvidenceRecorded).toBe(true);
    expect(handoff.liveExecutionVerified).toBe(false);
  });
});

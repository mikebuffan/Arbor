import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runArkWorkerCycle } from "@/lib/ark/runner";
import {
  loadResearchReinsBinding,
  runResearchReinsArkPulse,
} from "./researchReinsArkHost";

vi.mock("@/lib/ark/runner", () => ({
  runArkWorkerCycle: vi.fn(),
}));

const mockWorker = vi.mocked(runArkWorkerCycle);
const NOW = "2026-09-28T21:30:00.000Z";

function binding(overrides: Record<string, unknown> = {}) {
  return {
    runId: "run-1",
    runStatus: "active",
    userId: "owner-1",
    projectId: "project-1",
    sessionId: "session-1",
    objectiveId: "objective-1",
    taskId: "task-1",
    goal: "Bounded synthetic background research",
    taskStatus: "queued",
    taskAttemptCount: 0,
    taskMaxAttempts: 12,
    taskAvailableAt: "2026-09-28T21:29:00.000Z",
    objectiveStatus: "queued",
    sourceScope: "project_history",
    authorizationVersion: "reins-project-history-v1",
    sessionAuthorized: true,
    cancellationRequested: false,
    startedAt: "2026-09-28T20:00:00.000Z",
    deadlineAt: "2026-09-28T23:00:00.000Z",
    maxWorkUnits: 40,
    consumedWorkUnits: 2,
    maxCostCents: 100,
    committedCostCents: 3,
    ...overrides,
  };
}

function dbWithBindings(...rows: Array<Record<string, unknown> | null>) {
  let index = 0;
  const rpc = vi.fn(async (name: string) => {
    if (name !== "arbor_load_research_reins_binding") {
      throw new Error("unexpected rpc " + name);
    }
    const data = rows[Math.min(index, rows.length - 1)] ?? null;
    index += 1;
    return { data, error: null };
  });
  return {
    db: { rpc } as unknown as SupabaseClient,
    rpc,
  };
}

describe("DB-authoritative research reins ARK host", () => {
  beforeEach(() => {
    mockWorker.mockReset();
  });

  it("hydrates the full trusted binding including ARK attempt fences", async () => {
    const m = dbWithBindings(binding());
    await expect(loadResearchReinsBinding({
      supabase: m.db,
      runId: "run-1",
    })).resolves.toMatchObject({
      runId: "run-1",
      userId: "owner-1",
      projectId: "project-1",
      taskAttemptCount: 0,
      taskMaxAttempts: 12,
      sourceScope: "project_history",
      sessionAuthorized: true,
    });
  });

  it("stops before ARK when authorization is revoked or cancellation is requested", async () => {
    for (const row of [
      binding({ sessionAuthorized: false }),
      binding({ cancellationRequested: true }),
    ]) {
      const m = dbWithBindings(row);
      const result = await runResearchReinsArkPulse({
        runId: "run-1",
        supabase: m.db,
        now: () => new Date(NOW),
      });
      expect(result.action).toBe("stop");
      expect(mockWorker).not.toHaveBeenCalled();
    }
  });

  it("stops before ARK when the deadline or work budget is exhausted", async () => {
    for (const row of [
      binding({ deadlineAt: NOW }),
      binding({ consumedWorkUnits: 40 }),
      binding({ committedCostCents: 100 }),
    ]) {
      const m = dbWithBindings(row);
      const result = await runResearchReinsArkPulse({
        runId: "run-1",
        supabase: m.db,
        now: () => new Date(NOW),
      });
      expect(result.action).toBe("stop");
      expect(mockWorker).not.toHaveBeenCalled();
    }
  });

  it("stops a checkpointed/queued ARK task that already consumed its no-progress attempt budget", async () => {
    const m = dbWithBindings(binding({
      taskStatus: "checkpointed",
      taskAttemptCount: 12,
      taskMaxAttempts: 12,
    }));
    await expect(runResearchReinsArkPulse({
      runId: "run-1",
      supabase: m.db,
      now: () => new Date(NOW),
    })).resolves.toMatchObject({
      action: "stop",
      reason: "research_reins_ark_attempt_budget_exhausted",
    });
    expect(mockWorker).not.toHaveBeenCalled();
  });

  it("runs one pinned ARK cycle and resumes only after a still-active post-read", async () => {
    const m = dbWithBindings(
      binding(),
      binding({
        taskStatus: "checkpointed",
        taskAttemptCount: 0,
        objectiveStatus: "checkpointed",
        taskAvailableAt: "2026-09-28T21:30:30.000Z",
      }),
    );
    mockWorker.mockResolvedValueOnce({
      status: "completed",
      claimed: 1,
      completed: 0,
      checkpointed: 1,
      blocked: 0,
      failed: 0,
      verifiedObjectives: 0,
    });

    const result = await runResearchReinsArkPulse({
      runId: "run-1",
      supabase: m.db,
      now: () => new Date(NOW),
    });

    expect(mockWorker).toHaveBeenCalledWith(
      expect.objectContaining({
        objectiveId: "objective-1",
        workerId: "reins-ark:run-1",
        maxTasks: 1,
      }),
    );
    expect(result).toMatchObject({
      action: "resume",
      reason: "research_reins_ark_checkpointed",
      delaySeconds: 30,
      worker: {
        checkpointed: 1,
      },
      binding: {
        taskStatus: "checkpointed",
        taskAttemptCount: 0,
      },
    });
  });

  it("stops after ARK if the controller task becomes blocked", async () => {
    const m = dbWithBindings(
      binding(),
      binding({
        taskStatus: "blocked",
        objectiveStatus: "blocked",
      }),
    );
    mockWorker.mockResolvedValueOnce({
      status: "completed",
      claimed: 1,
      completed: 0,
      checkpointed: 0,
      blocked: 1,
      failed: 0,
      verifiedObjectives: 0,
    });

    await expect(runResearchReinsArkPulse({
      runId: "run-1",
      supabase: m.db,
      now: () => new Date(NOW),
    })).resolves.toMatchObject({
      action: "stop",
      reason: "research_reins_task_blocked",
    });
  });
});

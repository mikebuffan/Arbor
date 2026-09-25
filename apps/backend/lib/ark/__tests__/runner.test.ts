import { describe, expect, it } from "vitest";
import { ArkExecutorRegistry } from "@/lib/ark/executorRegistry";
import { registerArkCheckpointCanaryExecutor } from "@/lib/ark/checkpointCanaryExecutor";
import { runArkWorkerCycle } from "@/lib/ark/runner";
import type { ArkStore, ArkTaskCompletion } from "@/lib/ark/store";
import type {
  ArkCheckpoint,
  ArkClaim,
  ArkObjective,
  ArkObjectiveDraft,
  ArkTask,
  ArkVerification,
} from "@/lib/ark/types";
import { DEFAULT_ARK_BUDGET } from "@/lib/ark/types";
import { validateArkTaskGraph } from "@/lib/ark/stateMachine";

const START = Date.parse("2026-09-18T14:30:00.000Z");

class MemoryArkStore implements ArkStore {
  objectives = new Map<string, ArkObjective>();
  tasks = new Map<string, ArkTask>();
  checkpoints: ArkCheckpoint[] = [];
  nextId = 1;

  async enqueueObjective(draft: ArkObjectiveDraft): Promise<ArkObjective> {
    validateArkTaskGraph(draft.tasks);
    const existing = [...this.objectives.values()].find(
      (objective) => objective.userId === draft.userId &&
        objective.projectId === draft.projectId &&
        (objective as ArkObjective & { idempotencyKey?: string }).idempotencyKey === draft.idempotencyKey,
    );
    if (existing) return existing;
    const now = new Date(START).toISOString();
    const objective = {
      id: `objective-${this.nextId++}`,
      userId: draft.userId,
      projectId: draft.projectId,
      goal: draft.goal,
      status: "queued" as const,
      priority: draft.priority ?? 0,
      budget: { ...DEFAULT_ARK_BUDGET, ...draft.budget },
      blocker: null,
      completionEvidence: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      idempotencyKey: draft.idempotencyKey,
    };
    this.objectives.set(objective.id, objective);
    for (const task of draft.tasks) {
      const record: ArkTask = {
        id: `task-${this.nextId++}`,
        objectiveId: objective.id,
        userId: objective.userId,
        projectId: objective.projectId,
        taskKey: task.taskKey,
        kind: task.kind,
        description: task.description,
        status: "queued",
        dependencies: task.dependencies ?? [],
        payload: task.payload ?? {},
        result: null,
        attemptCount: 0,
        maxAttempts: task.maxAttempts ?? objective.budget.maxAttemptsPerTask,
        idempotencyKey: task.idempotencyKey,
        availableAt: now,
        leaseOwner: null,
        leaseToken: null,
        leaseExpiresAt: null,
        heartbeatAt: null,
        checkpointSequence: 0,
        version: 0,
        createdAt: now,
        updatedAt: now,
      };
      this.tasks.set(record.id, record);
    }
    return objective;
  }

  async claimNextTask(input: { workerId: string; leaseMs: number; now: string; excludedObjectiveIds?: string[]; onlyObjectiveId?: string }): Promise<ArkClaim | null> {
    const nowMs = Date.parse(input.now);
    for (const task of this.tasks.values()) {
      if (
        task.status === "running" &&
        task.leaseExpiresAt &&
        Date.parse(task.leaseExpiresAt) <= nowMs
      ) {
        task.status = task.attemptCount >= task.maxAttempts ? "failed" : "queued";
        task.leaseOwner = null;
        task.leaseToken = null;
        task.leaseExpiresAt = null;
      }
    }

    const task = [...this.tasks.values()].find((candidate) => {
      const objective = this.objectives.get(candidate.objectiveId)!;
      if (input.excludedObjectiveIds?.includes(objective.id)) return false;
      if (input.onlyObjectiveId && objective.id !== input.onlyObjectiveId) return false;
      const dependenciesComplete = candidate.dependencies.every((key) =>
        [...this.tasks.values()].some(
          (other) => other.objectiveId === candidate.objectiveId &&
            other.taskKey === key && other.status === "completed",
        ),
      );
      return (candidate.status === "queued" || candidate.status === "checkpointed") &&
        Date.parse(candidate.availableAt) <= nowMs &&
        candidate.attemptCount < candidate.maxAttempts &&
        ["queued", "running", "checkpointed"].includes(objective.status) &&
        dependenciesComplete;
    });
    if (!task) return null;
    task.status = "running";
    task.attemptCount += 1;
    task.leaseOwner = input.workerId;
    task.leaseToken = `lease-${task.id}-${task.attemptCount}`;
    task.leaseExpiresAt = new Date(nowMs + input.leaseMs).toISOString();
    task.heartbeatAt = input.now;
    const objective = this.objectives.get(task.objectiveId)!;
    objective.status = "running";
    return { objective: { ...objective }, task: { ...task } };
  }

  async nextObjectiveAwaitingVerification(objectiveId?: string): Promise<ArkObjective | null> {
    const objective = [...this.objectives.values()].find(
      (candidate) => candidate.status === "awaiting_verification" &&
        (!objectiveId || candidate.id === objectiveId),
    );
    return objective ? { ...objective } : null;
  }

  async heartbeat(input: { taskId: string; workerId: string; leaseToken: string; leaseMs: number; now: string }): Promise<boolean> {
    const task = this.tasks.get(input.taskId);
    if (!task || task.status !== "running" || task.leaseOwner !== input.workerId || task.leaseToken !== input.leaseToken) return false;
    task.heartbeatAt = input.now;
    task.leaseExpiresAt = new Date(Date.parse(input.now) + input.leaseMs).toISOString();
    return true;
  }

  async checkpoint(input: { claim: ArkClaim; checkpoint: ArkCheckpoint; now: string }): Promise<ArkTask> {
    const task = this.owned(input.claim);
    if (input.checkpoint.sequence !== task.checkpointSequence + 1) throw new Error("ark_checkpoint_sequence_conflict");
    task.status = "checkpointed";
    task.checkpointSequence = input.checkpoint.sequence;
    task.availableAt = input.checkpoint.resumeAfter ?? input.now;
    this.release(task);
    this.objectives.get(task.objectiveId)!.status = "checkpointed";
    this.checkpoints.push(input.checkpoint);
    return { ...task };
  }

  async completeTask(input: { claim: ArkClaim; result: unknown; now: string }): Promise<ArkTaskCompletion> {
    const task = this.owned(input.claim);
    task.status = "completed";
    task.result = input.result;
    this.release(task);
    const objective = this.objectives.get(task.objectiveId)!;
    objective.status = [...this.tasks.values()].every(
      (candidate) => candidate.objectiveId !== objective.id || candidate.status === "completed",
    ) ? "awaiting_verification" : "running";
    return { objective: { ...objective }, task: { ...task } };
  }

  async blockTask(input: { claim: ArkClaim; blocker: Record<string, unknown>; now: string }): Promise<ArkTaskCompletion> {
    const task = this.owned(input.claim);
    task.status = "blocked";
    task.result = { blocker: input.blocker };
    this.release(task);
    const objective = this.objectives.get(task.objectiveId)!;
    objective.status = "blocked";
    objective.blocker = input.blocker;
    return { objective: { ...objective }, task: { ...task } };
  }

  async failTask(input: { claim: ArkClaim; error: string; retryAt: string | null; now: string }): Promise<ArkTaskCompletion> {
    const task = this.owned(input.claim);
    const retry = input.retryAt !== null && task.attemptCount < task.maxAttempts;
    task.status = retry ? "queued" : "failed";
    if (retry) task.availableAt = input.retryAt!;
    this.release(task);
    const objective = this.objectives.get(task.objectiveId)!;
    objective.status = retry ? "queued" : "failed";
    return { objective: { ...objective }, task: { ...task } };
  }

  async verifyObjective(input: { objectiveId: string; verification: ArkVerification; now: string }): Promise<ArkObjective> {
    const objective = this.objectives.get(input.objectiveId)!;
    if (objective.status !== "awaiting_verification") throw new Error("ark_objective_not_awaiting_verification");
    objective.status = input.verification.ok ? "completed" : "blocked";
    objective.completionEvidence = input.verification.ok ? input.verification.evidence ?? null : null;
    return { ...objective };
  }

  private owned(claim: ArkClaim): ArkTask {
    const task = this.tasks.get(claim.task.id);
    if (!task || task.status !== "running" || task.leaseOwner !== claim.task.leaseOwner || task.leaseToken !== claim.task.leaseToken) {
      throw new Error("ark_lease_lost");
    }
    return task;
  }

  private release(task: ArkTask): void {
    task.leaseOwner = null;
    task.leaseToken = null;
    task.leaseExpiresAt = null;
    task.heartbeatAt = null;
  }
}

function draft(): ArkObjectiveDraft {
  return {
    userId: "user-1",
    projectId: "project-1",
    goal: "finish safely",
    idempotencyKey: "objective-1",
    tasks: [
      { taskKey: "act", kind: "test", description: "act", idempotencyKey: "task-act" },
      { taskKey: "verify", kind: "test", description: "verify", dependencies: ["act"], idempotencyKey: "task-verify" },
    ],
  };
}

describe("ARK autonomous work runner", () => {
  it("respects dependencies and requires explicit completion verification", async () => {
    const store = new MemoryArkStore();
    const objective = await store.enqueueObjective(draft());
    const order: string[] = [];
    const registry = new ArkExecutorRegistry().register("test", async ({ claim }) => {
      order.push(claim.task.taskKey);
      return { status: "completed", result: { verified: true } };
    });

    const result = await runArkWorkerCycle({
      store,
      executors: registry,
      workerId: "worker-1",
      now: () => new Date(START),
      verifyCompletion: async () => ({ ok: true, evidence: ["both tasks completed"] }),
    });

    expect(order).toEqual(["act", "verify"]);
    expect(result).toMatchObject({ completed: 2, verifiedObjectives: 1 });
    expect(store.objectives.get(objective.id)).toMatchObject({
      status: "completed",
      completionEvidence: ["both tasks completed"],
    });
  });

  it("recovers two dependent Preview canaries across independent bounded invocations", async () => {
    const store = new MemoryArkStore();
    const objective = await store.enqueueObjective({
      ...draft(),
      budget: {
        maxTasksPerCycle: 2, maxRuntimeMs: 10_000, maxAttemptsPerTask: 3,
      },
      tasks: [
        {
          taskKey: "checkpoint-a",
          kind: "ark.preview-checkpoint",
          description: "A",
          idempotencyKey: "preview-a",
          maxAttempts: 3,
        },
        {
          taskKey: "checkpoint-b",
          kind: "ark.preview-checkpoint",
          description: "B",
          idempotencyKey: "preview-b",
          dependencies: ["checkpoint-a"],
          maxAttempts: 3,
        },
      ],
    });
    let current = START;
    const registry = new ArkExecutorRegistry();
    registerArkCheckpointCanaryExecutor({
      registry, pinnedObjectiveId: objective.id,
      now: () => new Date(current),
    });
    const run = (workerId: string) => runArkWorkerCycle({
      store, executors: registry, workerId, objectiveId: objective.id,
      now: () => new Date(current), maxTasks: 2, maxRuntimeMs: 10_000,
      verifyCompletion: async () => {
        const tasks = [...store.tasks.values()].filter(
          (task) => task.objectiveId === objective.id,
        );
        return {
          ok: tasks.length === 2 && tasks.every(
            (task) => task.status === "completed" &&
              (task.result as { verified?: boolean } | null)?.verified === true,
          ),
          evidence: ["both dependent checkpoint tasks verified"],
        };
      },
    });

    const first = await run("first-worker");
    expect(first).toMatchObject({
      status: "waiting", claimed: 1, checkpointed: 1, completed: 0,
    });
    expect(store.checkpoints).toHaveLength(1);
    expect([...store.tasks.values()].find((t) => t.taskKey === "checkpoint-b"))
      .toMatchObject({ status: "queued", attemptCount: 0 });
    expect(store.objectives.get(objective.id)?.status).not.toBe("completed");

    current += 60_000;
    const second = await run("second-worker");
    expect(second).toMatchObject({ claimed: 2, completed: 1, checkpointed: 1 });
    expect(store.checkpoints).toHaveLength(2);
    expect(store.objectives.get(objective.id)?.status).not.toBe("completed");

    current += 60_000;
    const third = await run("third-worker");
    expect(third).toMatchObject({
      status: "completed", claimed: 1, completed: 1, verifiedObjectives: 1,
    });
    expect(store.objectives.get(objective.id)?.status).toBe("completed");
    for (const task of store.tasks.values()) {
      expect(task).toMatchObject({
        status: "completed", attemptCount: 2, checkpointSequence: 1,
      });
    }
  });

  it("checkpoints at an executor boundary and resumes after the declared time", async () => {
    const store = new MemoryArkStore();
    await store.enqueueObjective({ ...draft(), tasks: [draft().tasks[0]] });
    let current = START;
    let calls = 0;
    const registry = new ArkExecutorRegistry().register("test", async () => {
      calls += 1;
      if (calls === 1) {
        return {
          status: "checkpointed",
          checkpoint: {
            sequence: 1,
            state: { cursor: 5 },
            nextAction: "continue from cursor 5",
            reason: "budget",
            resumeAfter: new Date(START + 10_000).toISOString(),
          },
        };
      }
      return { status: "completed", result: { verified: true } };
    });

    const first = await runArkWorkerCycle({ store, executors: registry, workerId: "worker-1", objectiveId: [...store.objectives.keys()][0], now: () => new Date(current) });
    expect(first.status).toBe("waiting");
    expect(first.checkpointed).toBe(1);
    expect(calls).toBe(1);
    current += 10_000;
    const second = await runArkWorkerCycle({ store, executors: registry, workerId: "worker-2", now: () => new Date(current) });
    expect(second.completed).toBe(1);
    expect(store.checkpoints).toHaveLength(1);
  });

  it("does not report a pinned objective complete when independent verification is absent", async () => {
    const store = new MemoryArkStore();
    const objective = await store.enqueueObjective({
      ...draft(), tasks: [draft().tasks[0]],
    });
    const registry = new ArkExecutorRegistry().register("test", async () => ({
      status: "completed", result: { verified: true },
    }));
    const cycle = await runArkWorkerCycle({
      store, executors: registry, workerId: "awaiting-verifier",
      objectiveId: objective.id, maxTasks: 2,
      now: () => new Date(START),
    });
    expect(cycle).toMatchObject({
      status: "waiting", claimed: 1, completed: 1, verifiedObjectives: 0,
    });
    expect(store.objectives.get(objective.id)?.status).toBe("awaiting_verification");
  });

  it("recovers an expired claimed lease after a worker interruption", async () => {
    const store = new MemoryArkStore();
    const objective = await store.enqueueObjective({
      ...draft(),
      tasks: [{ ...draft().tasks[0], maxAttempts: 3 }],
    });

    const abandoned = await store.claimNextTask({
      workerId: "worker-that-died",
      leaseMs: 1000,
      now: new Date(START).toISOString(),
    });
    expect(abandoned?.task.status).toBe("running");

    let executions = 0;
    const registry = new ArkExecutorRegistry().register("test", async () => {
      executions += 1;
      return { status: "completed", result: { verified: true } };
    });

    const resumed = await runArkWorkerCycle({
      store,
      executors: registry,
      workerId: "replacement-worker",
      now: () => new Date(START + 1001),
      verifyCompletion: async () => ({ ok: true, evidence: ["recovered"] }),
    });

    expect(executions).toBe(1);
    expect(resumed.completed).toBe(1);
    expect(store.objectives.get(objective.id)?.status).toBe("completed");
    expect([...store.tasks.values()][0]?.attemptCount).toBe(2);
  });

  it("schedules bounded retry rather than replaying immediately", async () => {
    const store = new MemoryArkStore();
    await store.enqueueObjective({ ...draft(), tasks: [{ ...draft().tasks[0], maxAttempts: 2 }] });
    let current = START;
    let calls = 0;
    const registry = new ArkExecutorRegistry().register("test", async () => {
      calls += 1;
      if (calls === 1) throw new Error("temporary network failure token=private");
      return { status: "completed", result: { verified: true } };
    });

    const first = await runArkWorkerCycle({ store, executors: registry, workerId: "worker-1", now: () => new Date(current) });
    expect(first.failed).toBe(1);
    expect(calls).toBe(1);
    current += 1000;
    const second = await runArkWorkerCycle({ store, executors: registry, workerId: "worker-2", now: () => new Date(current) });
    expect(second.completed).toBe(1);
    expect(calls).toBe(2);
  });

  it("does not replay an executor-declared non-retryable failure", async () => {
    const store = new MemoryArkStore();
    const objective = await store.enqueueObjective({
      ...draft(),
      tasks: [{ ...draft().tasks[0], maxAttempts: 3 }],
    });
    let calls = 0;
    const registry = new ArkExecutorRegistry().register("test", async () => {
      calls += 1;
      return {
        status: "failed",
        error: "ambiguous write failure",
        retryable: false,
      };
    });

    const first = await runArkWorkerCycle({
      store,
      executors: registry,
      workerId: "worker-1",
      now: () => new Date(START),
    });
    expect(first.failed).toBe(1);
    expect(calls).toBe(1);
    expect(store.objectives.get(objective.id)?.status).toBe("failed");

    await runArkWorkerCycle({
      store,
      executors: registry,
      workerId: "worker-2",
      now: () => new Date(START + 1000),
    });
    expect(calls).toBe(1);
  });

  it("blocks unknown capabilities instead of pretending they ran", async () => {
    const store = new MemoryArkStore();
    const objective = await store.enqueueObjective({
      ...draft(),
      tasks: [{ ...draft().tasks[0], kind: "missing" }],
    });
    const result = await runArkWorkerCycle({
      store,
      executors: new ArkExecutorRegistry(),
      workerId: "worker-1",
      now: () => new Date(START),
    });
    expect(result.blocked).toBe(1);
    expect(store.objectives.get(objective.id)).toMatchObject({
      status: "blocked",
      blocker: { kind: "unsupported_capability" },
    });
  });

  it("retries a transient completion-gate failure without replaying completed work", async () => {
    const store = new MemoryArkStore();
    const objective = await store.enqueueObjective({
      ...draft(),
      tasks: [draft().tasks[0]],
    });
    let executions = 0;
    const registry = new ArkExecutorRegistry().register("test", async () => {
      executions += 1;
      return { status: "completed", result: { verified: true } };
    });

    await expect(runArkWorkerCycle({
      store,
      executors: registry,
      workerId: "worker-1",
      now: () => new Date(START),
      verifyCompletion: async () => {
        throw new Error("verification service unavailable");
      },
    })).rejects.toThrow("verification service unavailable");

    expect(executions).toBe(1);
    expect(store.objectives.get(objective.id)?.status).toBe(
      "awaiting_verification",
    );

    const resumed = await runArkWorkerCycle({
      store,
      executors: registry,
      workerId: "worker-2",
      now: () => new Date(START + 1000),
      verifyCompletion: async () => ({ ok: true, evidence: ["verified"] }),
    });

    expect(executions).toBe(1);
    expect(resumed.verifiedObjectives).toBe(1);
    expect(store.objectives.get(objective.id)?.status).toBe("completed");
  });

  it("can target one objective without consuming unrelated queued work", async () => {
    const store = new MemoryArkStore();
    const first = await store.enqueueObjective({
      ...draft(),
      idempotencyKey: "first",
      tasks: [{ ...draft().tasks[0], idempotencyKey: "first:act" }],
    });
    const second = await store.enqueueObjective({
      ...draft(),
      idempotencyKey: "second",
      tasks: [{ ...draft().tasks[0], idempotencyKey: "second:act" }],
    });
    const seen: string[] = [];
    const registry = new ArkExecutorRegistry().register("test", async ({ claim }) => {
      seen.push(claim.objective.id);
      return { status: "completed", result: { verified: true } };
    });

    await runArkWorkerCycle({
      store,
      executors: registry,
      workerId: "worker-targeted",
      objectiveId: second.id,
      now: () => new Date(START),
      verifyCompletion: async () => ({ ok: true }),
    });

    expect(seen).toEqual([second.id]);
    expect(store.objectives.get(second.id)?.status).toBe("completed");
    expect(store.objectives.get(first.id)?.status).toBe("queued");
  });

  it("finishes a long dependency chain across repeated continuation cycles without replay", async () => {
    const store = new MemoryArkStore();
    const tasks = Array.from({ length: 12 }, (_, index) => ({
      taskKey: `step-${index + 1}`,
      kind: "test",
      description: `step ${index + 1}`,
      dependencies: index === 0 ? [] : [`step-${index}`],
      idempotencyKey: `long:step-${index + 1}`,
    }));
    const objective = await store.enqueueObjective({
      userId: "user-1",
      projectId: "project-1",
      goal: "finish a long durable chain",
      idempotencyKey: "long-objective",
      budget: { maxTasksPerCycle: 3 },
      tasks,
    });
    const seen: string[] = [];
    const registry = new ArkExecutorRegistry().register("test", async ({ claim }) => {
      seen.push(claim.task.taskKey);
      return { status: "completed", result: { verified: true } };
    });

    for (let cycle = 0; cycle < 4; cycle += 1) {
      await runArkWorkerCycle({
        store,
        executors: registry,
        workerId: `worker-${cycle + 1}`,
        now: () => new Date(START + cycle * 1000),
        maxTasks: 100,
        verifyCompletion: async () => ({ ok: true, evidence: ["long chain complete"] }),
      });
    }

    expect(seen).toEqual(tasks.map((task) => task.taskKey));
    expect(new Set(seen).size).toBe(tasks.length);
    expect(store.objectives.get(objective.id)).toMatchObject({
      status: "completed",
      completionEvidence: ["long chain complete"],
    });
  });

  it("honors an objective task budget across continuation cycles", async () => {
    const store = new MemoryArkStore();
    const objective = await store.enqueueObjective({
      ...draft(),
      budget: { maxTasksPerCycle: 1 },
    });
    const order: string[] = [];
    const registry = new ArkExecutorRegistry().register("test", async ({ claim }) => {
      order.push(claim.task.taskKey);
      return { status: "completed", result: { verified: true } };
    });

    const first = await runArkWorkerCycle({
      store,
      executors: registry,
      workerId: "worker-1",
      now: () => new Date(START),
      verifyCompletion: async () => ({ ok: true }),
    });
    expect(first.completed).toBe(1);
    expect(order).toEqual(["act"]);
    expect(store.objectives.get(objective.id)?.status).toBe("running");

    const second = await runArkWorkerCycle({
      store,
      executors: registry,
      workerId: "worker-2",
      now: () => new Date(START + 1000),
      verifyCompletion: async () => ({ ok: true }),
    });
    expect(second.completed).toBe(1);
    expect(order).toEqual(["act", "verify"]);
    expect(store.objectives.get(objective.id)?.status).toBe("completed");
  });


  it("reports completed when a pinned objective verifies on its exact final task budget", async () => {
    const store = new MemoryArkStore();
    const objective = await store.enqueueObjective({
      ...draft(), tasks: [{ ...draft().tasks[0] }],
    });
    const registry = new ArkExecutorRegistry().register("test", async () => ({
      status: "completed", result: { verified: true },
    }));
    const result = await runArkWorkerCycle({
      store, executors: registry, workerId: "budget-final",
      objectiveId: objective.id, maxTasks: 1,
      now: () => new Date(START),
      verifyCompletion: async () => ({ ok: true, evidence: ["completed"] }),
    });
    expect(result).toMatchObject({ status: "completed", completed: 1, verifiedObjectives: 1 });
    expect(store.objectives.get(objective.id)?.status).toBe("completed");
  });

  it("never marks an unverified final task complete solely because the budget ended", async () => {
    const store = new MemoryArkStore();
    const objective = await store.enqueueObjective({
      ...draft(), tasks: [{ ...draft().tasks[0] }],
    });
    const registry = new ArkExecutorRegistry().register("test", async () => ({
      status: "completed", result: { verified: true },
    }));
    const result = await runArkWorkerCycle({
      store, executors: registry, workerId: "budget-no-approval",
      objectiveId: objective.id, maxTasks: 1,
      now: () => new Date(START),
      verifyCompletion: async () => ({ ok: false, evidence: ["not accepted"] }),
    });
    expect(result.status).not.toBe("completed");
    expect(result.verifiedObjectives).toBe(0);
    expect(store.objectives.get(objective.id)?.status).toBe("blocked");
  });
});

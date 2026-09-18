import type { ArkExecutorRegistry } from "./executorRegistry";
import type { ArkStore } from "./store";
import type {
  ArkExecutionResult,
  ArkObjective,
  ArkVerification,
} from "./types";

export type ArkCompletionVerifier = (
  objective: ArkObjective,
) => Promise<ArkVerification>;

export type ArkWorkerCycleResult = {
  status: "completed" | "idle" | "budget_exhausted";
  claimed: number;
  completed: number;
  checkpointed: number;
  blocked: number;
  failed: number;
  verifiedObjectives: number;
};

function safeError(error: unknown): string {
  return error instanceof Error
    ? error.message.replace(/(bearer|token|password|secret)\s*[:=]\s*\S+/gi, "$1=[redacted]").slice(0, 1000)
    : "ark_executor_failed";
}

function retryDelayMs(attempt: number): number {
  return Math.min(60_000, 1000 * 2 ** Math.max(0, attempt - 1));
}

export async function runArkWorkerCycle(input: {
  store: ArkStore;
  executors: ArkExecutorRegistry;
  workerId: string;
  leaseMs?: number;
  maxTasks?: number;
  maxRuntimeMs?: number;
  now?: () => Date;
  verifyCompletion?: ArkCompletionVerifier;
}): Promise<ArkWorkerCycleResult> {
  const now = input.now ?? (() => new Date());
  const leaseMs = Math.min(3_600_000, Math.max(1000, input.leaseMs ?? 60_000));
  const maxTasks = Math.min(100, Math.max(1, input.maxTasks ?? 8));
  const maxRuntimeMs = Math.min(
    300_000,
    Math.max(1000, input.maxRuntimeMs ?? 25_000),
  );
  const startedAt = now().getTime();
  const objectiveRuns = new Map<string, { count: number; startedAt: number }>();
  const excludedObjectiveIds = new Set<string>();
  const result: ArkWorkerCycleResult = {
    status: "idle",
    claimed: 0,
    completed: 0,
    checkpointed: 0,
    blocked: 0,
    failed: 0,
    verifiedObjectives: 0,
  };

  if (input.verifyCompletion) {
    const awaiting = await input.store.nextObjectiveAwaitingVerification();
    if (awaiting) {
      const verification = await input.verifyCompletion(awaiting);
      await input.store.verifyObjective({
        objectiveId: awaiting.id,
        verification,
        now: now().toISOString(),
      });
      if (verification.ok) result.verifiedObjectives += 1;
    }
  }

  for (let index = 0; index < maxTasks; index += 1) {
    if (now().getTime() - startedAt >= maxRuntimeMs) {
      result.status = "budget_exhausted";
      return result;
    }

    const claimedAt = now().toISOString();
    const claim = await input.store.claimNextTask({
      workerId: input.workerId,
      leaseMs,
      now: claimedAt,
      excludedObjectiveIds: [...excludedObjectiveIds],
    });
    if (!claim) {
      result.status = result.claimed > 0 ? "completed" : "idle";
      return result;
    }
    result.claimed += 1;
    const objectiveRun = objectiveRuns.get(claim.objective.id) ?? {
      count: 0,
      startedAt: now().getTime(),
    };
    objectiveRun.count += 1;
    objectiveRuns.set(claim.objective.id, objectiveRun);

    const enforceObjectiveBudget = () => {
      if (
        objectiveRun.count >= claim.objective.budget.maxTasksPerCycle ||
        now().getTime() - objectiveRun.startedAt >=
          claim.objective.budget.maxRuntimeMs
      ) {
        excludedObjectiveIds.add(claim.objective.id);
      }
    };

    const executor = input.executors.get(claim.task.kind);
    if (!executor) {
      await input.store.blockTask({
        claim,
        blocker: {
          kind: "unsupported_capability",
          message: `No ARK executor is registered for ${claim.task.kind}`,
        },
        now: now().toISOString(),
      });
      result.blocked += 1;
      enforceObjectiveBudget();
      continue;
    }

    let execution: ArkExecutionResult;
    try {
      execution = await executor({
        claim,
        heartbeat: async () => {
          const renewed = await input.store.heartbeat({
            taskId: claim.task.id,
            workerId: input.workerId,
            leaseToken: claim.task.leaseToken ?? "",
            leaseMs,
            now: now().toISOString(),
          });
          if (!renewed) throw new Error("ark_lease_lost");
        },
      });

    } catch (error: unknown) {
      const canRetry = claim.task.attemptCount < claim.task.maxAttempts;
      const retryAt = canRetry
        ? new Date(now().getTime() + retryDelayMs(claim.task.attemptCount)).toISOString()
        : null;
      await input.store.failTask({
        claim,
        error: safeError(error),
        retryAt,
        now: now().toISOString(),
      });
      result.failed += 1;
      enforceObjectiveBudget();
      continue;
    }

    if (execution.status === "checkpointed") {
      await input.store.checkpoint({
        claim,
        checkpoint: execution.checkpoint,
        now: now().toISOString(),
      });
      result.checkpointed += 1;
      enforceObjectiveBudget();
      continue;
    }

    if (execution.status === "blocked") {
      await input.store.blockTask({
        claim,
        blocker: execution.blocker,
        now: now().toISOString(),
      });
      result.blocked += 1;
      enforceObjectiveBudget();
      continue;
    }

    if (execution.status === "failed") {
      const canRetry =
        execution.retryable && claim.task.attemptCount < claim.task.maxAttempts;
      const retryMs = Math.min(
        60_000,
        Math.max(1000, execution.retryAfterMs ?? retryDelayMs(claim.task.attemptCount)),
      );
      await input.store.failTask({
        claim,
        error: safeError(execution.error),
        retryAt: canRetry
          ? new Date(now().getTime() + retryMs).toISOString()
          : null,
        now: now().toISOString(),
      });
      result.failed += 1;
      enforceObjectiveBudget();
      continue;
    }

    const completion = await input.store.completeTask({
      claim,
      result: execution.result ?? null,
      now: now().toISOString(),
    });
    result.completed += 1;
    enforceObjectiveBudget();

    if (
      completion.objective.status === "awaiting_verification" &&
      input.verifyCompletion
    ) {
      const verification = await input.verifyCompletion(completion.objective);
      await input.store.verifyObjective({
        objectiveId: completion.objective.id,
        verification,
        now: now().toISOString(),
      });
      if (verification.ok) result.verifiedObjectives += 1;
    }
  }

  result.status = "budget_exhausted";
  return result;
}

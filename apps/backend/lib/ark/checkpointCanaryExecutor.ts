import type { ArkExecutorRegistry } from "./executorRegistry";

/**
 * Explicitly registered ONLY for the reviewed, pinned Preview objective.
 * No external action or private-document access: this tests the real ARK
 * checkpoint/lease/verification storage path using a future resume time.
 */
export function registerArkCheckpointCanaryExecutor(input: {
  registry: ArkExecutorRegistry;
  pinnedObjectiveId: string;
  now?: () => Date;
}): void {
  const now = input.now ?? (() => new Date());
  input.registry.register("ark.preview-checkpoint", async ({ claim, heartbeat }) => {
    if (claim.objective.id !== input.pinnedObjectiveId) {
      return {
        status: "blocked",
        blocker: {
          kind: "unsupported_capability",
          message: "Preview checkpoint canary is not authorized for this objective",
        },
      };
    }

    await heartbeat();
    if (claim.task.checkpointSequence === 0) {
      return {
        status: "checkpointed",
        checkpoint: {
          sequence: 1,
          state: { phase: "waiting_for_new_worker" },
          nextAction: "Resume the authorized Preview checkpoint canary",
          reason: "interruption",
          resumeAfter: new Date(now().getTime() + 60_000).toISOString(),
        },
      };
    }

    return {
      status: "completed",
      result: {
        verified: true,
        capability: "ark.preview-checkpoint",
        attempts: claim.task.attemptCount,
        checkpointSequence: claim.task.checkpointSequence,
        previewOnly: true,
      },
    };
  });
}

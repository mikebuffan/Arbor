import {
  executeWithArborAgency,
  type ArborAgencyExecution,
} from "./executor.js";
import {
  PredicateGoalVerifier,
} from "./goalVerification.js";
import type {
  ArborRecoveryRouteLearningStore,
} from "./routeLearning.js";
import type {
  ArborBlocker,
} from "./types.js";

function isTransientHostBlocker(
  blocker: ArborBlocker,
) {
  if (
    blocker.kind !== "host_failure" &&
    blocker.kind !== "tool_failure" &&
    blocker.kind !== "unknown"
  ) {
    return false;
  }

  return /timeout|temporar|transient|disconnect|reset|closed|unavailable|network|socket|transport|rate limit|429|502|503|504/.test(
    blocker.message.toLowerCase(),
  );
}

export async function generateWithArborAgency<T>(
  input: {
    id: string;
    goal: string;
    primaryAction: string;
    generate: () => Promise<T>;
    verify: (
      value: T,
    ) => boolean | Promise<boolean>;
    learningStore:
      ArborRecoveryRouteLearningStore;
    requiredUserInput?: string;
  },
): Promise<ArborAgencyExecution<T>> {
  return executeWithArborAgency({
    id: input.id,
    goal: input.goal,
    primaryAction:
      input.primaryAction,
    primary:
      input.generate,
    learningStore:
      input.learningStore,
    policy: {
      maximumAutonomousAttempts: 2,
      rejectDuplicateRouteIds: true,
      requireGoalVerification: true,
      minimumGoalVerificationConfidence:
        1,
    },
    goalVerifier:
      new PredicateGoalVerifier<T>(
        (context) =>
          input.verify(
            context.recoveredValue,
          ),
        1,
      ),
    recoveryRoutes: [
      {
        id:
          `retry-transient-host-generation-once:${input.id}`,
        description:
          "Retry the same generation once after a transient host or transport failure.",
        confidence: 0.9,
        requiresUserInput: false,
        preservesGoal: true,
        applicable:
          isTransientHostBlocker,
        execute:
          input.generate,
      },
      {
        id:
          `reauthorize-host-provider:${input.id}`,
        description:
          "Resume generation after the host provider is reconnected or authorized.",
        confidence: 0.98,
        requiresUserInput: true,
        requiredUserInput:
          input.requiredUserInput ??
          "Reconnect or authorize the host provider.",
        preservesGoal: true,
        applicable:
          (blocker) =>
            (
              blocker.kind === "permission" ||
              blocker.kind === "missing_capability" ||
              blocker.kind === "host_failure" ||
              blocker.kind === "unknown"
            ) &&
            /\b(?:401|403|auth|unauthori[sz]ed|forbidden|credential|token|login|reconnect|connect|permission)\b/i.test(
              blocker.message,
            ),
        async execute() {
          throw new Error(
            "ARBOR_USER_INPUT_ROUTE_EXECUTED_DIRECTLY",
          );
        },
      },
    ],
  });
}

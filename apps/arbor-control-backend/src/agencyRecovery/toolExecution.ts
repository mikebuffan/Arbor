import {
  executeWithArborAgency,
  type ArborRecoveryRouteProvider,
} from "./executor.js";
import {
  PredicateGoalVerifier,
} from "./goalVerification.js";
import {
  InMemoryArborRecoveryRouteLearningStore,
  type ArborRecoveryRouteLearningStore,
} from "./routeLearning.js";
import type {
  ArborAgencyDecision,
} from "./types.js";

export interface ArborToolRoute<T> {
  id: string;
  description: string;
  confidence: number;
  requiresUserInput: boolean;
  requiredUserInput?: string;
  preservesGoal: boolean;
  applicable(
    blockerKind: string,
    blockerMessage: string,
  ): boolean;
  execute(): Promise<T>;
}

export interface ArborToolExecutionResult<T> {
  value: T;
  recovered: boolean;
  selectedRouteId?: string;
  attemptedRouteIds: string[];
  decision: ArborAgencyDecision;
}

export class ArborToolExecutionBlockedError
  extends Error {
  readonly name =
    "ArborToolExecutionBlockedError";

  constructor(
    readonly decision:
      ArborAgencyDecision,
  ) {
    super(
      [
        "ARBOR_TOOL_EXECUTION_BLOCKED",
        decision.status,
        decision.blocker?.kind ??
          "unknown",
        decision.requiredUserInput ??
          "no-user-input-requested",
        ...decision.attemptedOptionIds,
      ].join(":"),
    );
  }
}

export async function executeToolWithArborAgency<T>(
  input: {
    id: string;
    goal: string;
    primaryAction: string;
    primary: () => Promise<T>;
    recoveryRoutes: ArborToolRoute<T>[];
    verify(
      value: T,
    ): boolean | Promise<boolean>;
    learningStore?:
      ArborRecoveryRouteLearningStore;
    maximumAutonomousAttempts?: number;
    routeProvider?:
      ArborRecoveryRouteProvider<T>;
  },
): Promise<ArborToolExecutionResult<T>> {
  const learningStore =
    input.learningStore ??
    new InMemoryArborRecoveryRouteLearningStore();

  const verifiedPrimary =
    async () => {
      const value =
        await input.primary();

      const valid =
        await input.verify(
          value,
        );

      if (!valid) {
        throw new Error(
          "ARBOR_TOOL_RESULT_VERIFICATION_FAILED",
        );
      }

      return value;
    };

  const execution =
    await executeWithArborAgency({
      id: input.id,
      goal: input.goal,
      primaryAction:
        input.primaryAction,
      primary: verifiedPrimary,
      recoverable: true,
      learningStore,
      policy: {
        maximumAutonomousAttempts:
          input.maximumAutonomousAttempts ??
          4,
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
      routeProvider:
        input.routeProvider,
      recoveryRoutes:
        input.recoveryRoutes.map(
          (route) => ({
            id: route.id,
            description:
              route.description,
            confidence:
              route.confidence,
            requiresUserInput:
              route.requiresUserInput,
            requiredUserInput:
              route.requiredUserInput,
            preservesGoal:
              route.preservesGoal,
            applicable:
              (blocker) =>
                route.applicable(
                  blocker.kind,
                  blocker.message,
                ),
            execute:
              route.execute,
          }),
        ),
    });

  if (
    execution.value ===
    undefined
  ) {
    throw new ArborToolExecutionBlockedError(
      execution.decision,
    );
  }

  return {
    value:
      execution.value,
    recovered:
      execution.recovered,
    selectedRouteId:
      execution.decision
        .selectedOptionId,
    attemptedRouteIds: [
      ...execution.decision
        .attemptedOptionIds,
    ],
    decision:
      execution.decision,
  };
}

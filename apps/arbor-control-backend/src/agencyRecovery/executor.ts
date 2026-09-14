import { classifyArborBlocker } from "./blockerClassifier.js";
import type { ArborAgencyDecision, ArborBlocker } from "./types.js";
import {
  InMemoryArborRecoveryRouteLearningStore,
  learnedRouteScore,
  type ArborRecoveryRouteLearningStore,
} from "./routeLearning.js";
import {
  AcceptDeclaredGoalVerifier,
  type ArborGoalVerifier,
} from "./goalVerification.js";

export interface ArborAgencyRoute<T> {
  id: string;
  description: string;
  confidence: number;
  requiresUserInput: boolean;
  requiredUserInput?: string;
  preservesGoal: boolean;
  applicable(blocker: ArborBlocker): boolean;
  execute(): Promise<T>;
}

export interface ArborRecoveryDiscoveryContext {
  rootBlocker: ArborBlocker;
  latestBlocker: ArborBlocker;
  goal: string;
  attemptedOptionIds: string[];
  evidence: string[];
  failedRouteId?: string;
}

export interface ArborRecoveryRouteProvider<T> {
  discover(
    context: ArborRecoveryDiscoveryContext,
  ): Promise<ArborAgencyRoute<T>[]>;
}

export interface ArborAgencyExecution<T> {
  value?: T;
  decision: ArborAgencyDecision;
  recovered: boolean;
}

export interface ArborAgencyExecutionPolicy {
  maximumAutonomousAttempts: number;
  rejectDuplicateRouteIds: boolean;
  requireGoalVerification: boolean;
  minimumGoalVerificationConfidence: number;
}

export const DEFAULT_ARB0R_AGENCY_EXECUTION_POLICY:
  ArborAgencyExecutionPolicy = {
    maximumAutonomousAttempts: 6,
    rejectDuplicateRouteIds: true,
    requireGoalVerification: false,
    minimumGoalVerificationConfidence: 0.75,
  };

function assertUniqueRouteIds<T>(routes: ArborAgencyRoute<T>[]) {
  const seen = new Set<string>();

  for (const route of routes) {
    if (seen.has(route.id)) {
      throw new Error(
        `ARBOR_AGENCY_DUPLICATE_ROUTE_ID:${route.id}`,
      );
    }
    seen.add(route.id);
  }
}

export async function executeWithArborAgency<T>(input: {
  id: string;
  goal: string;
  primaryAction: string;
  primary: () => Promise<T>;
  recoveryRoutes: ArborAgencyRoute<T>[];
  recoverable?: boolean;
  learningStore?: ArborRecoveryRouteLearningStore;
  policy?: Partial<ArborAgencyExecutionPolicy>;
  goalVerifier?: ArborGoalVerifier<T>;
  routeProvider?: ArborRecoveryRouteProvider<T>;
}): Promise<ArborAgencyExecution<T>> {
  const policy: ArborAgencyExecutionPolicy = {
    ...DEFAULT_ARB0R_AGENCY_EXECUTION_POLICY,
    ...(input.policy ?? {}),
  };

  const learningStore =
    input.learningStore ??
    new InMemoryArborRecoveryRouteLearningStore();

  if (policy.rejectDuplicateRouteIds) {
    assertUniqueRouteIds(input.recoveryRoutes);
  }

  try {
    const value = await input.primary();

    return {
      value,
      recovered: false,
      decision: {
        status: "completed",
        attemptedOptionIds: [],
        evidence: ["PRIMARY_ACTION_SUCCEEDED"],
        nextAction: input.primaryAction,
      },
    };
  } catch (primaryError) {
    const blocker = classifyArborBlocker({
      id: input.id,
      error: primaryError,
      failedAction: input.primaryAction,
      goal: input.goal,
      recoverable: input.recoverable,
    });

    if (!blocker.recoverable) {
      return {
        recovered: false,
        decision: {
          status: "blocked",
          blocker,
          attemptedOptionIds: [],
          evidence: [
            ...blocker.evidence,
            "PRIMARY_ROUTE_FAILED_NON_RECOVERABLE",
          ],
        },
      };
    }

    const rootBlocker = blocker;
    let latestBlocker = blocker;
    const attemptedOptionIds: string[] = [];
    const evidence: string[] = [
      ...blocker.evidence,
      `PRIMARY_ROUTE_FAILED:${String(primaryError)}`,
    ];

    const routePool =
      new Map<string, ArborAgencyRoute<T>>();

    for (const route of input.recoveryRoutes) {
      routePool.set(route.id, route);
    }

    const discoverRoutes = async (
      failedRouteId?: string,
    ) => {
      if (!input.routeProvider) {
        return;
      }

      let discovered: ArborAgencyRoute<T>[];

      try {
        discovered = await input.routeProvider.discover({
          rootBlocker,
          latestBlocker,
          goal: input.goal,
          attemptedOptionIds: [...attemptedOptionIds],
          evidence: [...evidence],
          failedRouteId,
        });
      } catch (discoveryError) {
        evidence.push(
          [
            "RECOVERY_ROUTE_DISCOVERY_FAILED",
            failedRouteId ?? "initial",
            String(discoveryError),
          ].join(":"),
        );
        return;
      }

      for (const route of discovered) {
        if (routePool.has(route.id)) {
          evidence.push(
            `DISCOVERED_ROUTE_DUPLICATE_IGNORED:${route.id}`,
          );
          continue;
        }

        routePool.set(route.id, route);
        evidence.push(
          `RECOVERY_ROUTE_DISCOVERED:${route.id}`,
        );
      }
    };

    const rankAvailableRoutes = async () => {
      const scored = await Promise.all(
        [...routePool.values()]
          .filter(
            (route) =>
              route.preservesGoal &&
              route.applicable(latestBlocker) &&
              !attemptedOptionIds.includes(route.id),
          )
          .map(async (route) => {
            const stats = await learningStore.get(route.id);

            return {
              route,
              stats,
              learnedScore: learnedRouteScore({
                baseConfidence: route.confidence,
                stats,
              }),
            };
          }),
      );

      return scored.sort(
        (a, b) =>
          b.learnedScore - a.learnedScore,
      );
    };

    await discoverRoutes();

    while (
      attemptedOptionIds.length <
      policy.maximumAutonomousAttempts
    ) {
      const candidates =
        await rankAvailableRoutes();

      const candidate = candidates.find(
        (item) =>
          !item.route.requiresUserInput,
      );

      if (!candidate) {
        break;
      }

      const route = candidate.route;

      attemptedOptionIds.push(route.id);

      evidence.push(
        [
          "RECOVERY_ROUTE_SELECTED",
          route.id,
          `base=${route.confidence.toFixed(3)}`,
          `learned=${candidate.learnedScore.toFixed(3)}`,
          `attempts=${candidate.stats.attempts}`,
          `successes=${candidate.stats.successes}`,
          `failures=${candidate.stats.failures}`,
        ].join(":"),
      );

      try {
        const value = await route.execute();

        const verifier =
          input.goalVerifier ??
          new AcceptDeclaredGoalVerifier<T>();

        const verification = await verifier.verify({
          goal: input.goal,
          primaryAction: input.primaryAction,
          recoveryRouteId: route.id,
          recoveryDescription: route.description,
          recoveredValue: value,
        });

        evidence.push(...verification.evidence);

        const verificationAccepted =
          verification.preserved &&
          verification.confidence >=
            policy.minimumGoalVerificationConfidence;

        if (
          policy.requireGoalVerification &&
          !verificationAccepted
        ) {
          await learningStore.recordFailure(route.id);

          evidence.push(
            [
              "RECOVERY_RESULT_REJECTED",
              route.id,
              `preserved=${verification.preserved}`,
              `confidence=${verification.confidence.toFixed(3)}`,
            ].join(":"),
          );

          latestBlocker = classifyArborBlocker({
            id: `${input.id}:verification:${route.id}`,
            error: new Error(
              "ARBOR_RECOVERY_RESULT_VERIFICATION_FAILED",
            ),
            failedAction: route.description,
            goal: input.goal,
            recoverable: true,
          });

          await discoverRoutes(route.id);
          continue;
        }

        if (!verification.preserved) {
          await learningStore.recordFailure(route.id);

          evidence.push(
            `RECOVERY_ROUTE_DID_NOT_PRESERVE_GOAL:${route.id}`,
          );

          latestBlocker = classifyArborBlocker({
            id: `${input.id}:verification:${route.id}`,
            error: new Error(
              "ARBOR_RECOVERY_RESULT_DID_NOT_PRESERVE_GOAL",
            ),
            failedAction: route.description,
            goal: input.goal,
            recoverable: true,
          });

          await discoverRoutes(route.id);
          continue;
        }

        await learningStore.recordSuccess(route.id);

        evidence.push(
          `RECOVERY_ROUTE_SUCCEEDED:${route.id}`,
        );

        return {
          value,
          recovered: true,
          decision: {
            status: "recovered",
            blocker: latestBlocker,
            attemptedOptionIds,
            evidence,
            selectedOptionId: route.id,
            nextAction: route.description,
          },
        };
      } catch (recoveryError) {
        await learningStore.recordFailure(route.id);

        evidence.push(
          `RECOVERY_ROUTE_FAILED:${route.id}:${String(recoveryError)}`,
        );

        latestBlocker = classifyArborBlocker({
          id: `${input.id}:recovery:${route.id}`,
          error: recoveryError,
          failedAction: route.description,
          goal: input.goal,
          recoverable: true,
        });

        await discoverRoutes(route.id);
      }
    }

    const remaining =
      await rankAvailableRoutes();

    if (
      attemptedOptionIds.length >=
        policy.maximumAutonomousAttempts &&
      remaining.some(
        (item) =>
          !item.route.requiresUserInput,
      )
    ) {
      evidence.push(
        `AGENCY_ATTEMPT_LIMIT_REACHED:${policy.maximumAutonomousAttempts}`,
      );
    }

    const userRoute = remaining.find(
      (item) =>
        item.route.requiresUserInput,
    );

    return {
      recovered: false,
      decision: {
        status:
          userRoute
            ? "needs_user"
            : "blocked",
        blocker: latestBlocker,
        attemptedOptionIds,
        evidence: [
          ...evidence,
          userRoute
            ? `USER_INPUT_ROUTE_SELECTED:${userRoute.route.id}`
            : "ALL_GOAL_PRESERVING_ROUTES_EXHAUSTED",
        ],
        selectedOptionId:
          userRoute?.route.id,
        nextAction:
          userRoute?.route.description,
        requiredUserInput:
          userRoute?.route.requiredUserInput,
      },
    };
  }
}

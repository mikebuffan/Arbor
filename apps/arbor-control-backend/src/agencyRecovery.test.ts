import {
  describe,
  expect,
  it,
} from "vitest";

import {
  executeWithArborAgency,
} from "./agencyRecovery/executor.js";
import {
  InMemoryArborRecoveryRouteLearningStore,
} from "./agencyRecovery/routeLearning.js";
import {
  generateWithArborAgency,
} from "./agencyRecovery/hostGeneration.js";

describe(
  "portable agency recovery",
  () => {
    it(
      "tries autonomous alternatives before asking the user",
      async () => {
        const attempted: string[] = [];

        const result =
          await executeWithArborAgency({
            id: "agency-alternatives",
            goal: "finish despite original route failure",
            primaryAction: "write original target",
            primary: async () => {
              throw new Error(
                "permission denied: target is read-only",
              );
            },
            recoveryRoutes: [
              {
                id: "retry-read-only-target",
                description:
                  "retry the same read-only target",
                confidence: 0.99,
                requiresUserInput: false,
                preservesGoal: true,
                applicable: (blocker) =>
                  blocker.kind === "permission",
                async execute() {
                  attempted.push(
                    "retry-read-only-target",
                  );
                  throw new Error(
                    "permission denied again",
                  );
                },
              },
              {
                id: "use-writable-working-copy",
                description:
                  "move work to a writable copy",
                confidence: 0.95,
                requiresUserInput: false,
                preservesGoal: true,
                applicable: (blocker) =>
                  blocker.kind === "permission",
                async execute() {
                  attempted.push(
                    "use-writable-working-copy",
                  );
                  return {
                    completed: true,
                  };
                },
              },
              {
                id: "ask-user-to-fix-permissions",
                description:
                  "ask the user to change permissions",
                confidence: 0.8,
                requiresUserInput: true,
                requiredUserInput:
                  "Change the target permissions.",
                preservesGoal: true,
                applicable: (blocker) =>
                  blocker.kind === "permission",
                async execute() {
                  attempted.push(
                    "ask-user-to-fix-permissions",
                  );
                  return {
                    completed: false,
                  };
                },
              },
            ],
          });

        expect(result.recovered).toBe(true);
        expect(
          result.decision.selectedOptionId,
        ).toBe(
          "use-writable-working-copy",
        );
        expect(attempted).toEqual([
          "retry-read-only-target",
          "use-writable-working-copy",
        ]);
      },
    );

    it(
      "uses learned reliability and caps autonomous loops",
      async () => {
        const learning =
          new InMemoryArborRecoveryRouteLearningStore();

        for (
          let index = 0;
          index < 3;
          index += 1
        ) {
          await learning.recordFailure(
            "flaky-high-base",
          );
          await learning.recordSuccess(
            "reliable-lower-base",
          );
        }

        const attempted: string[] = [];

        const learned =
          await executeWithArborAgency({
            id: "agency-learning",
            goal: "finish task",
            primaryAction: "primary",
            primary: async () => {
              throw new Error(
                "network timeout",
              );
            },
            learningStore: learning,
            recoveryRoutes: [
              {
                id: "flaky-high-base",
                description:
                  "historically flaky",
                confidence: 0.95,
                requiresUserInput: false,
                preservesGoal: true,
                applicable: () => true,
                async execute() {
                  attempted.push(
                    "flaky-high-base",
                  );
                  return "flaky";
                },
              },
              {
                id: "reliable-lower-base",
                description:
                  "historically reliable",
                confidence: 0.8,
                requiresUserInput: false,
                preservesGoal: true,
                applicable: () => true,
                async execute() {
                  attempted.push(
                    "reliable-lower-base",
                  );
                  return "reliable";
                },
              },
            ],
          });

        expect(learned.value).toBe(
          "reliable",
        );
        expect(attempted[0]).toBe(
          "reliable-lower-base",
        );

        const cappedAttempts: string[] = [];

        const capped =
          await executeWithArborAgency({
            id: "agency-cap",
            goal: "do not loop forever",
            primaryAction: "primary",
            primary: async () => {
              throw new Error(
                "network timeout",
              );
            },
            policy: {
              maximumAutonomousAttempts: 2,
              rejectDuplicateRouteIds: true,
            },
            recoveryRoutes: [
              "route-a",
              "route-b",
              "route-c",
            ].map(
              (id, index) => ({
                id,
                description: id,
                confidence:
                  1 - index * 0.05,
                requiresUserInput: false,
                preservesGoal: true,
                applicable: () => true,
                async execute() {
                  cappedAttempts.push(id);
                  throw new Error(
                    `failed:${id}`,
                  );
                },
              }),
            ),
          });

        expect(cappedAttempts).toHaveLength(
          2,
        );
        expect(
          capped.decision.evidence,
        ).toContain(
          "AGENCY_ATTEMPT_LIMIT_REACHED:2",
        );
      },
    );

    it(
      "evolves the blocker and discovers a route for the latest failure",
      async () => {
        const observedKinds: string[] = [];

        const result =
          await executeWithArborAgency({
            id: "agency-blocker-evolution",
            goal: "finish operation",
            primaryAction: "write-primary",
            primary: async () => {
              throw new Error(
                "permission denied",
              );
            },
            recoveryRoutes: [
              {
                id: "first-workaround",
                description:
                  "try alternate write mechanism",
                confidence: 0.99,
                requiresUserInput: false,
                preservesGoal: true,
                applicable: (blocker) =>
                  blocker.kind === "permission",
                async execute() {
                  throw new Error(
                    "unsupported missing capability",
                  );
                },
              },
            ],
            routeProvider: {
              async discover(context) {
                observedKinds.push(
                  context.latestBlocker.kind,
                );

                if (
                  context.failedRouteId ===
                    "first-workaround" &&
                  context.latestBlocker.kind ===
                    "missing_capability"
                ) {
                  return [
                    {
                      id: "capability-aware-route",
                      description:
                        "supply missing capability",
                      confidence: 0.97,
                      requiresUserInput: false,
                      preservesGoal: true,
                      applicable: (blocker) =>
                        blocker.kind ===
                        "missing_capability",
                      async execute() {
                        return {
                          completed: true,
                        };
                      },
                    },
                  ];
                }

                return [];
              },
            },
          });

        expect(observedKinds[0]).toBe(
          "permission",
        );
        expect(observedKinds).toContain(
          "missing_capability",
        );
        expect(result.recovered).toBe(true);
        expect(
          result.decision.selectedOptionId,
        ).toBe(
          "capability-aware-route",
        );
        expect(
          result.decision.blocker?.kind,
        ).toBe(
          "missing_capability",
        );
      },
    );

    it(
      "retries transient host generation without user intervention",
      async () => {
        let calls = 0;
        const learning =
          new InMemoryArborRecoveryRouteLearningStore();

        const result =
          await generateWithArborAgency({
            id: "host-transient",
            goal: "produce the Arbor response",
            primaryAction: "host.generate",
            learningStore: learning,
            generate: async () => {
              calls += 1;
              if (calls === 1) {
                throw new Error(
                  "temporary transport timeout",
                );
              }
              return {
                text: "recovered response",
              };
            },
            verify: (value) =>
              value.text.trim().length > 0,
          });

        expect(calls).toBe(2);
        expect(result.recovered).toBe(true);
        expect(result.value?.text).toBe(
          "recovered response",
        );
      },
    );

    it(
      "discovers a new autonomous route after a known workaround fails",
      async () => {
        const attempted: string[] = [];
        let discoveryCalls = 0;

        const result =
          await executeWithArborAgency({
            id: "agency-dynamic-discovery",
            goal: "finish blocked operation",
            primaryAction: "primary-route",
            primary: async () => {
              throw new Error(
                "permission denied",
              );
            },
            recoveryRoutes: [
              {
                id: "known-route-that-fails",
                description:
                  "try known writable target",
                confidence: 0.99,
                requiresUserInput: false,
                preservesGoal: true,
                applicable: (blocker) =>
                  blocker.kind === "permission",
                async execute() {
                  attempted.push(
                    "known-route-that-fails",
                  );
                  throw new Error(
                    "target also read-only",
                  );
                },
              },
            ],
            routeProvider: {
              async discover(context) {
                discoveryCalls += 1;

                if (
                  context.failedRouteId !==
                  "known-route-that-fails"
                ) {
                  return [];
                }

                return [
                  {
                    id:
                      "newly-discovered-writable-copy",
                    description:
                      "create writable working copy",
                    confidence: 0.97,
                    requiresUserInput: false,
                    preservesGoal: true,
                    applicable: (blocker) =>
                      blocker.kind === "permission",
                    async execute() {
                      attempted.push(
                        "newly-discovered-writable-copy",
                      );
                      return {
                        completed: true,
                      };
                    },
                  },
                ];
              },
            },
          });

        expect(result.recovered).toBe(true);
        expect(
          result.decision.selectedOptionId,
        ).toBe(
          "newly-discovered-writable-copy",
        );
        expect(attempted).toEqual([
          "known-route-that-fails",
          "newly-discovered-writable-copy",
        ]);
        expect(discoveryCalls).toBeGreaterThanOrEqual(
          2,
        );
        expect(
          result.decision.evidence,
        ).toContain(
          "RECOVERY_ROUTE_DISCOVERED:newly-discovered-writable-copy",
        );
      },
    );
  },
);

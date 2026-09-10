import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ArborCapabilityRegistry,
  requiresUserBoundary,
} from "./capabilities.js";

describe(
  "capability risk boundaries",
  () => {
    it(
      "does not boundary reversible work",
      () => {
        const registry =
          new ArborCapabilityRegistry()
            .register({
              name:
                "reversible",
              description:
                "test",
              parameters: {
                type:
                  "object",
                properties:
                  {},
                required:
                  [],
                additionalProperties:
                  false,
              },
              risk:
                "reversible_write",
              async execute() {
                return {
                  result:
                    "done",
                };
              },
            });

        expect(
          requiresUserBoundary(
            registry.get(
              "reversible",
            ),
          ),
        ).toBe(
          false,
        );
      },
    );

    it.each([
      "irreversible",
      "high_consequence",
    ] as const)(
      "requires a boundary for %s work",
      (
        risk,
      ) => {
        const registry =
          new ArborCapabilityRegistry()
            .register({
              name:
                risk,
              description:
                "test",
              parameters: {
                type:
                  "object",
                properties:
                  {},
                required:
                  [],
                additionalProperties:
                  false,
              },
              risk,
              async execute() {
                throw new Error(
                  "must_not_execute",
                );
              },
            });

        expect(
          requiresUserBoundary(
            registry.get(
              risk,
            ),
          ),
        ).toBe(
          true,
        );
      },
    );
  },
);

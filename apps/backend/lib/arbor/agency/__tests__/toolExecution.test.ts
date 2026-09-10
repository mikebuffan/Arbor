import {
  describe,
  expect,
  it,
} from "vitest";

import {
  executeAgencyToolWithRecovery,
} from "../toolExecution";

import type {
  AgencyTool,
  AgencyToolContext,
} from "../tools";

const context: AgencyToolContext = {
  userId: "user-1",
  projectId: "project-1",
  conversationId:
    "conversation-1",
  turnId: "turn-1",
};

function tool(
  input: Partial<AgencyTool> &
    Pick<
      AgencyTool,
      "name" | "risk" | "execute"
    >,
): AgencyTool {
  return {
    description: input.name,
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    ...input,
  };
}

describe(
  "executeAgencyToolWithRecovery",
  () => {
    it(
      "retries a failed read once and returns recovered success",
      async () => {
        let calls = 0;

        const result =
          await executeAgencyToolWithRecovery({
            tool: tool({
              name: "read-state",
              risk: "read",
              async execute() {
                calls += 1;

                if (calls === 1) {
                  throw new Error(
                    "temporary provider failure",
                  );
                }

                return {
                  state: "ok",
                };
              },
            }),
            args: {},
            context,
            attemptedRoutes: [
              "read-state",
            ],
          });

        expect(result.ok).toBe(true);
        expect(result.attempts).toBe(2);
        expect(calls).toBe(2);

        if (result.ok) {
          expect(result.result).toEqual({
            state: "ok",
          });
          expect(
            result.recoveredFailures,
          ).toHaveLength(1);
        }
      },
    );

    it(
      "does not automatically retry a failed write",
      async () => {
        let calls = 0;

        const result =
          await executeAgencyToolWithRecovery({
            tool: tool({
              name: "write-state",
              risk:
                "reversible_write",
              async execute() {
                calls += 1;
                throw new Error(
                  "provider failed after request",
                );
              },
            }),
            args: {},
            context,
            attemptedRoutes: [
              "write-state",
            ],
          });

        expect(result.ok).toBe(false);
        expect(result.attempts).toBe(1);
        expect(calls).toBe(1);

        if (!result.ok) {
          expect(
            result.recovery.kind,
          ).toBe("block");
        }
      },
    );

    it(
      "does not retry invalid read input",
      async () => {
        let calls = 0;

        const result =
          await executeAgencyToolWithRecovery({
            tool: tool({
              name: "read-invalid",
              risk: "read",
              async execute() {
                calls += 1;
                throw new Error(
                  "agency_tool_invalid_query",
                );
              },
            }),
            args: {},
            context,
            attemptedRoutes: [
              "read-invalid",
            ],
          });

        expect(result.ok).toBe(false);
        expect(result.attempts).toBe(1);
        expect(calls).toBe(1);

        if (!result.ok) {
          expect(
            result.failure.kind,
          ).toBe("invalid_input");
          expect(
            result.failure.retryable,
          ).toBe(false);
        }
      },
    );

    it(
      "surfaces an untried semantic alternate without executing it blindly",
      async () => {
        let calls = 0;

        const result =
          await executeAgencyToolWithRecovery({
            tool: tool({
              name: "provider-a",
              risk:
                "reversible_write",
              alternateRoutes: [
                "provider-b",
              ],
              async execute() {
                calls += 1;
                throw new Error(
                  "provider A failed",
                );
              },
            }),
            args: {
              payload: "value",
            },
            context,
            attemptedRoutes: [
              "provider-a",
            ],
          });

        expect(result.ok).toBe(false);
        expect(calls).toBe(1);

        if (!result.ok) {
          expect(
            result.recovery,
          ).toEqual({
            kind: "alternate",
            route: "provider-b",
            reason:
              "provider A failed",
          });
        }
      },
    );
  },
);

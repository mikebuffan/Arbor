import { describe, expect, it } from "vitest";

import type { AgencyResult } from "./agency.js";
import { runAgencyToBoundary } from "./agencyOrchestrator.js";

describe("runAgencyToBoundary", () => {
  it("stops at the outer execution ceiling instead of looping forever", async () => {
    let calls = 0;

    const result = await runAgencyToBoundary({
      initialInput: {
        state: {
          goal: "bounded objective",
          unresolvedWork: ["still working"],
        } as AgencyResult["state"],
      },
      maxWindows: 3,
      run: async (input): Promise<AgencyResult> => {
        calls += 1;
        return {
          status: "checkpointed",
          text: `checkpoint ${calls}`,
          state: {
            ...input.state,
            unresolvedWork: [`window ${calls + 1}`],
          },
          rounds: 12,
          toolCalls: 1,
          researchCalls: 0,
        };
      },
    });

    expect(calls).toBe(3);
    expect(result.status).toBe("checkpointed");
    expect(result.text).toContain("outer execution ceiling reached");
    expect(result.rounds).toBe(36);
    expect(result.toolCalls).toBe(3);
    expect(result.state.unresolvedWork).toEqual(["window 4"]);
  });

  it("returns immediately when a real boundary is reached", async () => {
    let calls = 0;

    const result = await runAgencyToBoundary({
      initialInput: {
        state: {
          goal: "authorization-bound objective",
          unresolvedWork: ["await authorization"],
        } as AgencyResult["state"],
      },
      run: async (input): Promise<AgencyResult> => {
        calls += 1;
        return {
          status: "blocked",
          text: "authorization required",
          state: input.state,
          rounds: 1,
          toolCalls: 0,
          researchCalls: 0,
          blocker: "authorization_required",
          capability: "canary.write",
          requiredUserInput: "Approve the protected action.",
        };
      },
    });

    expect(calls).toBe(1);
    expect(result.status).toBe("blocked");
    expect(result.text).toBe("authorization required");
  });

  it("automatically resumes checkpointed agency work without another user turn", async () => {
    let calls = 0;
    const seenGoals: Array<string | null | undefined> = [];

    const result = await runAgencyToBoundary({
      initialInput: {
        state: {
          goal: "finish parent objective",
          unresolvedWork: ["step 1", "step 2"],
        } as AgencyResult["state"],
      },
      run: async (input): Promise<AgencyResult> => {
        calls += 1;
        seenGoals.push(input.state.goal);

        if (calls === 1) {
          return {
            status: "checkpointed",
            text: "checkpoint",
            state: {
              ...input.state,
              unresolvedWork: ["step 2"],
            },
            rounds: 12,
            toolCalls: 3,
            researchCalls: 2,
          };
        }

        return {
          status: "complete",
          text: "done",
          state: {
            ...input.state,
            unresolvedWork: [],
          },
          rounds: 4,
          toolCalls: 1,
          researchCalls: 1,
        };
      },
    });

    expect(calls).toBe(2);
    expect(seenGoals).toEqual([
      "finish parent objective",
      "finish parent objective",
    ]);
    expect(result.status).toBe("complete");
    expect(result.rounds).toBe(16);
    expect(result.toolCalls).toBe(4);
    expect(result.researchCalls).toBe(3);
    expect(result.state.unresolvedWork).toEqual([]);
  });

  it("can rebuild derived continuation input from checkpointed state", async () => {
    let calls = 0;
    const seenInstructions: string[] = [];

    const result = await runAgencyToBoundary({
      initialInput: {
        instructions: "unresolved: step 1, step 2",
        state: {
          goal: "finish parent objective",
          unresolvedWork: ["step 1", "step 2"],
        } as AgencyResult["state"],
      },
      prepareNextInput: (next) => ({
        ...next,
        instructions: `unresolved: ${next.state.unresolvedWork.join(", ")}`,
      }),
      run: async (input): Promise<AgencyResult> => {
        calls += 1;
        seenInstructions.push(input.instructions);

        if (calls === 1) {
          return {
            status: "checkpointed",
            text: "checkpoint",
            state: {
              ...input.state,
              unresolvedWork: ["step 2"],
            },
            rounds: 12,
            toolCalls: 0,
            researchCalls: 0,
          };
        }

        return {
          status: "complete",
          text: "done",
          state: {
            ...input.state,
            unresolvedWork: [],
          },
          rounds: 1,
          toolCalls: 0,
          researchCalls: 0,
        };
      },
    });

    expect(seenInstructions).toEqual([
      "unresolved: step 1, step 2",
      "unresolved: step 2",
    ]);
    expect(result.status).toBe("complete");
  });

  it("preserves the latest checkpoint when the outer ceiling is reached", async () => {
    const result = await runAgencyToBoundary({
      maxWindows: 2,
      initialInput: {
        state: {
          goal: "keep going",
          unresolvedWork: ["window 0"],
        } as AgencyResult["state"],
      },
      run: async (input): Promise<AgencyResult> => ({
        status: "checkpointed",
        text: "checkpoint",
        state: {
          ...input.state,
          unresolvedWork: [
            input.state.unresolvedWork[0] === "window 0"
              ? "window 1"
              : "window 2",
          ],
        },
        rounds: 12,
        toolCalls: 1,
        researchCalls: 1,
      }),
    });

    expect(result.status).toBe("checkpointed");
    expect(result.state.unresolvedWork).toEqual(["window 2"]);
    expect(result.rounds).toBe(24);
    expect(result.toolCalls).toBe(2);
    expect(result.researchCalls).toBe(2);
  });
});

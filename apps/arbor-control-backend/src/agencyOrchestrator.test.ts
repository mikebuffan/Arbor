import { describe, expect, it } from "vitest";

import type { AgencyResult } from "./agency.js";
import { runAgencyToBoundary } from "./agencyOrchestrator.js";

describe("runAgencyToBoundary", () => {
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
});

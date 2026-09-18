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
  it("does not hand back a completed child while the parent objective is active", async () => {
    let calls = 0;
    const result = await runAgencyToBoundary({
      initialInput: {
        state: {
          goal: "finish whole build",
          unresolvedWork: ["integration verification"],
          objective: {
            parentGoal: "finish whole build",
            completionCriteria: ["all verification complete"],
            standingAuthorization: ["safe reversible work"],
            hardStops: ["merge", "deploy"],
            nextAction: "integration verification",
            checkpoint: "child step complete",
            status: "active",
            revision: 3,
          },
        } as AgencyResult["state"],
      },
      run: async (input): Promise<AgencyResult> => {
        calls += 1;
        if (calls === 1) {
          return {
            status: "complete",
            text: "child complete",
            state: { ...input.state, unresolvedWork: [] },
            rounds: 1, toolCalls: 0, researchCalls: 0,
          };
        }
        return {
          status: "complete",
          text: "parent complete",
          state: {
            ...input.state,
            unresolvedWork: [],
            objective: { ...input.state.objective!, status: "complete", nextAction: null },
          },
          rounds: 1, toolCalls: 0, researchCalls: 0,
        };
      },
    });
    expect(calls).toBe(2);
    expect(result.status).toBe("complete");
    expect(result.boundaryReason).toBe("objective-complete");
    expect(result.state.objective?.status).toBe("complete");
  });

  it("labels an execution ceiling as resumable, not completed", async () => {
    const result = await runAgencyToBoundary({
      maxWindows: 1,
      initialInput: {
        state: {
          goal: "keep working",
          unresolvedWork: ["next step"],
        } as AgencyResult["state"],
      },
      run: async (input): Promise<AgencyResult> => ({
        status: "checkpointed",
        text: "saved",
        state: input.state,
        rounds: 1, toolCalls: 0, researchCalls: 0,
      }),
    });
    expect(result.status).toBe("checkpointed");
    expect(result.boundaryReason).toBe("execution-ceiling");
    expect(result.text).toMatch(/not completion/i);
  });
});

import { describe, expect, it } from "vitest";
import type { AgencyState } from "../engine";
import { nextObjective } from "../session";

describe("durable parent objective lifecycle", () => {
  it("creates a parent objective with standing safe-work authorization", () => {
    const objective = nextObjective(
      null,
      "finish the whole build",
      ["run verification"],
      false,
    );

    expect(objective?.parentGoal).toBe("finish the whole build");
    expect(objective?.status).toBe("active");
    expect(objective?.nextAction).toBe("run verification");
    expect(objective?.standingAuthorization.join(" ")).toMatch(
      /safe reversible/i,
    );
  });

  it("resumes the same parent objective and advances its revision", () => {
    const prior: AgencyState = {
      goal: "finish the whole build",
      status: "active",
      currentStep: 9,
      unresolvedWork: ["old next"],
      recurringWeaknesses: [],
      strategyNotes: [],
      blocker: null,
      objective: {
        parentGoal: "finish the whole build",
        completionCriteria: ["verified"],
        standingAuthorization: ["safe reversible work"],
        hardStops: ["deploy"],
        nextAction: "old next",
        checkpoint: "step 8",
        status: "active",
        revision: 12,
      },
    };

    const objective = nextObjective(
      prior,
      prior.goal,
      ["new next"],
      true,
    );

    expect(objective?.parentGoal).toBe(prior.objective?.parentGoal);
    expect(objective?.revision).toBe(13);
    expect(objective?.nextAction).toBe("new next");
  });
});

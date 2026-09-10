import { describe, expect, it } from "vitest";
import type { AgencyState } from "../engine";
import {
  resolveAgencyGoal,
  shouldResumeAgencyGoal,
} from "../continuation";

const prior: AgencyState = {
  goal: "finish the Arbor linear runtime",
  status: "active",
  currentStep: 7,
  unresolvedWork: ["wire Voice"],
  recurringWeaknesses: [],
  strategyNotes: [],
  blocker: null,
};

describe("agency continuation", () => {
  it.each([
    "go",
    "okay",
    "continue",
    "keep going",
    "do it",
    "finish it",
    "yep",
  ])("resumes unresolved work for %s", (text) => {
    expect(shouldResumeAgencyGoal(text, prior)).toBe(true);

    expect(resolveAgencyGoal(text, prior)).toEqual({
      goal: prior.goal,
      resume: true,
    });
  });

  it("does not hijack a new explicit goal", () => {
    const resolved = resolveAgencyGoal(
      "Explain the deployment failure instead",
      prior,
    );

    expect(resolved.resume).toBe(false);
    expect(resolved.goal).toBe(
      "Explain the deployment failure instead",
    );
  });

  it("does not resume a completed goal", () => {
    const completed: AgencyState = {
      ...prior,
      status: "complete",
    };

    expect(
      shouldResumeAgencyGoal("go", completed),
    ).toBe(false);
  });
});

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

  it.each([
    "don't wait for me",
    "you didn't go",
    "you're not done",
    "finish what you can",
    "why did you stop",
    "you tell me to do my thing but you don't do your thing",
    "what now",
    "did you finish",
    "what are we doing",
  ])("resumes unresolved work for corrective/status turn: %s", (text) => {
    expect(shouldResumeAgencyGoal(text, prior)).toBe(true);

    expect(resolveAgencyGoal(text, prior)).toEqual({
      goal: prior.goal,
      resume: true,
    });
  });

  it("does not let a status check revive empty work", () => {
    const empty: AgencyState = {
      ...prior,
      unresolvedWork: [],
    };

    expect(
      shouldResumeAgencyGoal("what now", empty),
    ).toBe(false);
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

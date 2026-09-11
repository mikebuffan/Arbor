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
    "gooooo",
    "okay",
    "continue",
    "continue please",
    "keep going",
    "k. keep going",
    "do it",
    "finish it",
    "yep",
    "are you doing it",
    "you stop again arbor",
    "just do it in one go",
    "do the whole list please",
    "find a workaround if needed",
  ])("resumes unresolved work for %s", (text) => {
    expect(shouldResumeAgencyGoal(text, prior)).toBe(true);

    expect(resolveAgencyGoal(text, prior)).toEqual({
      goal: prior.goal,
      resume: true,
    });
  });

  it("treats blocker replies as continuation unless the user explicitly switches goals", () => {
    const blocked: AgencyState = {
      ...prior,
      status: "blocked",
      blocker: "missing_preference",
    };

    expect(resolveAgencyGoal("use the first option", blocked)).toEqual({
      goal: blocked.goal,
      resume: true,
    });
  });

  it("does not hijack a new explicit goal", () => {
    const resolved = resolveAgencyGoal(
      "instead, explain the deployment failure",
      prior,
    );

    expect(resolved.resume).toBe(false);
    expect(resolved.goal).toBe(
      "instead, explain the deployment failure",
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

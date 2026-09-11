import { describe, expect, it } from "vitest";
import type { AgencyState } from "../engine";
import { resolveAgencyGoal, shouldResumeAgencyGoal } from "../continuation";

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
    "gooooo",
    "continue please",
    "k. keep going",
    "are you doing it",
    "you stop again arbor",
    "just do it in one go",
    "list and then do the whole list please",
    "find a workaround if needed",
  ])("resumes unresolved work for %s", (text) => {
    expect(shouldResumeAgencyGoal(text, prior)).toBe(true);
    expect(resolveAgencyGoal(text, prior)).toEqual({ goal: prior.goal, resume: true });
  });

  it("resumes after a blocker reply", () => {
    const blocked: AgencyState = { ...prior, status: "blocked", blocker: "missing_preference" };
    expect(resolveAgencyGoal("use the first option", blocked)).toEqual({ goal: blocked.goal, resume: true });
  });

  it("allows an explicit goal switch", () => {
    expect(resolveAgencyGoal("instead, explain the deployment failure", prior)).toEqual({
      goal: "instead, explain the deployment failure",
      resume: false,
    });
  });

  it("does not resume a completed goal", () => {
    expect(shouldResumeAgencyGoal("go", { ...prior, status: "complete" })).toBe(false);
  });
});

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
    "list and then do the whole list please",
    "find a workaround if needed",
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
    "you just did it again",
    "don't make me babysit you",
    "I don't want to tell you to go anymore",
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

  it("resumes after a blocker reply", () => {
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

  it("does not let a status check revive empty work", () => {
    const empty: AgencyState = {
      ...prior,
      unresolvedWork: [],
    };

    expect(
      shouldResumeAgencyGoal("what now", empty),
    ).toBe(false);
  });

  it("allows an explicit goal switch", () => {
    expect(
      resolveAgencyGoal(
        "instead, explain the deployment failure",
        prior,
      ),
    ).toEqual({
      goal: "instead, explain the deployment failure",
      resume: false,
    });
  });

  it("does not resume a completed goal", () => {
    expect(
      shouldResumeAgencyGoal("go", {
        ...prior,
        status: "complete",
      }),
    ).toBe(false);
  });
});

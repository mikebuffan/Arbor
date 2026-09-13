import { describe, expect, it } from "vitest";
import type { AgencyState } from "../engine";
import { resolveAgencyGoal } from "../continuation";

const active: AgencyState = {
  goal: "finish the agency repair",
  status: "active",
  currentStep: 9,
  unresolvedWork: ["inspect runner", "verify recovery", "run regression"],
  recurringWeaknesses: [],
  strategyNotes: [],
  blocker: null,
};

describe("structural agency continuation", () => {
  it.each([
    "research the next failure and fix it",
    "that still leaves the sibling branch unresolved",
    "check the implementation against the old architecture",
    "the evidence changed so replan it",
  ])("keeps ownership of active unresolved work without a magic phrase: %s", (text) => {
    expect(resolveAgencyGoal(text, active)).toEqual({
      goal: active.goal,
      resume: true,
    });
  });

  it("still permits an explicit goal replacement", () => {
    expect(resolveAgencyGoal("instead, start a different task", active)).toEqual({
      goal: "instead, start a different task",
      resume: false,
    });
  });
});

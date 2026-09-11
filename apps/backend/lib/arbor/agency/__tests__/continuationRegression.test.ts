import { describe, expect, it } from "vitest";
import type { AgencyState } from "../engine";
import { resolveAgencyGoal } from "../continuation";

const active: AgencyState = {
  goal: "finish the full acoustics implementation and verify it",
  status: "active",
  currentStep: 8,
  unresolvedWork: ["wait for CI", "merge the PR", "inspect agency"],
  recurringWeaknesses: [],
  strategyNotes: [],
  blocker: null,
};

describe("agency continuation regression", () => {
  it.each([
    "you stop again arbor",
    "list and then do the whole list please",
  ])("keeps the existing action chain for %s", (text) => {
    expect(resolveAgencyGoal(text, active)).toEqual({
      goal: active.goal,
      resume: true,
    });
  });
});

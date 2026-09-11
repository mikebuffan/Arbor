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
  it("does not replace active work with stop-feedback", () => {
    expect(resolveAgencyGoal("you stop again arbor", active)).toEqual({
      goal: active.goal,
      resume: true,
    });
  });

  it("does not replace active work with an action-chain instruction", () => {
    expect(
      resolveAgencyGoal("list and then do the whole list please", active),
    ).toEqual({
      goal: active.goal,
      resume: true,
    });
  });
});

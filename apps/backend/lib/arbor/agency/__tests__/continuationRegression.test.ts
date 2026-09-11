import { describe, expect, it } from "vitest";
import type { AgencyState } from "../engine";
import {
  resolveAgencyGoal,
} from "../continuation";

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
  it("preserves the original goal after stop-feedback instead of replacing it with the complaint", () => {
    expect(resolveAgencyGoal("you stop again arbor", active)).toEqual({
      goal: active.goal,
      resume: true,
    });
  });

  it("preserves the original goal when the user asks for the whole action chain", () => {
    expect(
      resolveAgencyGoal("list and then do the whole list please", active),
    ).toEqual({
      goal: active.goal,
      resume: true,
    });
  });
});

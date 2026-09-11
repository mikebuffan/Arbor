import { describe, expect, it } from "vitest";
import type { AgencyState } from "../engine";
import {
  resolveAgencyGoal,
  shouldResumeAgencyGoal,
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
  it.each([
    "k. keep going",
    "continue please",
    "gooooo",
    "are you doing it",
    "you stop again arbor",
    "stop telling me without going",
    "just do it in one go",
    "do the whole list please",
    "find a workaround if needed",
  ])("keeps the active goal for corrective continuation: %s", (text) => {
    expect(shouldResumeAgencyGoal(text, active)).toBe(true);
    expect(resolveAgencyGoal(text, active)).toEqual({
      goal: active.goal,
      resume: true,
    });
  });

  it("treats a reply to a blocker as continuation by default", () => {
    const blocked: AgencyState = {
      ...active,
      status: "blocked",
      blocker: {
        kind: "missing_information",
        reason: "Need the branch name",
      },
    };

    expect(
      resolveAgencyGoal("arbor-linear-voice-acoustic-bubble", blocked),
    ).toEqual({
      goal: blocked.goal,
      resume: true,
    });
  });

  it("still allows an explicit goal switch", () => {
    const resolved = resolveAgencyGoal(
      "instead, explain the deployment failure",
      active,
    );

    expect(resolved.resume).toBe(false);
    expect(resolved.goal).toBe("instead, explain the deployment failure");
  });
});

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
    expect(
      shouldResumeAgencyGoal(text, prior),
    ).toBe(true);

    expect(
      resolveAgencyGoal(text, prior),
    ).toEqual({
      goal: prior.goal,
      resume: true,
      superseded: false,
    });
  });

  it(
    "keeps a live goal through an ordinary follow-up",
    () => {
      expect(
        resolveAgencyGoal(
          "Make sure you run the code in here please",
          prior,
        ),
      ).toEqual({
        goal: prior.goal,
        resume: true,
        superseded: false,
      });
    },
  );

  it(
    "does not mistake now-I-want phrasing for a new task",
    () => {
      expect(
        resolveAgencyGoal(
          "Now I want you to run the tests in here",
          prior,
        ),
      ).toEqual({
        goal: prior.goal,
        resume: true,
        superseded: false,
      });
    },
  );

  it(
    "keeps a blocked unresolved goal through an ordinary follow-up",
    () => {
      const blocked: AgencyState = {
        ...prior,
        status: "blocked",
        blocker: "external_authority",
      };

      expect(
        shouldResumeAgencyGoal(
          "I handled the permission problem",
          blocked,
        ),
      ).toBe(true);
    },
  );

  it("allows an explicit task switch", () => {
    const resolved =
      resolveAgencyGoal(
        "Switch to a new task: explain the deployment failure",
        prior,
      );

    expect(
      resolved.resume,
    ).toBe(false);

    expect(
      resolved.superseded,
    ).toBe(true);

    expect(
      resolved.goal,
    ).toBe(
      "Switch to a new task: explain the deployment failure",
    );
  });

  it("does not resume a completed goal", () => {
    const completed: AgencyState = {
      ...prior,
      status: "complete",
    };

    expect(
      shouldResumeAgencyGoal(
        "go",
        completed,
      ),
    ).toBe(false);
  });
});

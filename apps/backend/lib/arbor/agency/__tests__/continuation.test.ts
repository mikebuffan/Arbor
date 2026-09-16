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
    "gooooo",
    "continue please",
    "k. keep going",
    "are you doing it",
    "you stop again arbor",
    "just do it in one go",
    "list and then do the whole list please",
    "find a workaround if needed",
    "I don't want to tell you to go",
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

  it("resumes a blocked goal from a direct blocker answer", () => {
    const blocked: AgencyState = {
      ...prior,
      status: "blocked",
      blocker: "missing_preference",
    };

    for (const text of ["use the first option", "option 2", "go with cedar"]) {
      expect(shouldResumeAgencyGoal(text, blocked)).toBe(true);
    }
  });

  it("does not carry a nominally active goal with no unresolved work", () => {
    const empty: AgencyState = {
      ...prior,
      unresolvedWork: [],
    };

    expect(shouldResumeAgencyGoal("go", empty)).toBe(false);
  });

  it(
    "does not let an unrelated substantive turn inherit a stale active goal",
    () => {
      const resolved =
        resolveAgencyGoal(
          "Why did Mike compare me to Einstein?",
          prior,
        );

      expect(resolved).toEqual({
        goal: "Why did Mike compare me to Einstein?",
        resume: false,
        superseded: false,
      });
    },
  );

  it(
    "does not require magic switch language for a clearly unrelated question",
    () => {
      expect(
        shouldResumeAgencyGoal(
          "What did I eat yesterday?",
          prior,
        ),
      ).toBe(false);
    },
  );


  it(
    "never treats a bare Arbor presence tether as resumable work",
    () => {
      const stalePresence: AgencyState = {
        ...prior,
        goal: "Arbor",
        status: "active",
        unresolvedWork: ["complete goal: Arbor"],
      };

      expect(
        shouldResumeAgencyGoal(
          "Why did Mike compare me to Einstein?",
          stalePresence,
        ),
      ).toBe(false);
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

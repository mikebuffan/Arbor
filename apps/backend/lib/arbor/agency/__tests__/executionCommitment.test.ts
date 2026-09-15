import {
  describe,
  expect,
  it,
} from "vitest";

import {
  candidateDefersExecution,
  enforceExecutionCommitment,
  goalRequestsExecution,
  shouldForceExecutionContinuation,
  type AgencyCompletionVerification,
} from "../verifier";

const completeVerification: AgencyCompletionVerification = {
  complete: true,
  score: 1,
  unresolvedWork: [],
  evidence: [],
  strategyCorrection: null,
  behaviorViolations: [],
};

describe("agency execution commitment", () => {
  it("treats explicit execution requests as executional", () => {
    expect(goalRequestsExecution("Can you fix it please?")).toBe(true);
    expect(goalRequestsExecution("continue")).toBe(true);
    expect(goalRequestsExecution("Please implement the change")).toBe(true);
  });

  it("does not turn advice requests into forced execution", () => {
    expect(
      goalRequestsExecution(
        "Do you think this is a good idea?",
      ),
    ).toBe(false);
    expect(
      goalRequestsExecution(
        "What are my options here?",
      ),
    ).toBe(false);
  });

  it("recognizes permission-loop and future-action deferral language", () => {
    expect(
      candidateDefersExecution(
        "Yeah, that is a good idea. Want me to implement it?",
      ),
    ).toBe(true);
    expect(
      candidateDefersExecution(
        "Good call. Here's what I'd do next.",
      ),
    ).toBe(true);
  });

  it("forces continuation when judgment replaces an already-requested action", () => {
    const result = enforceExecutionCommitment({
      goal: "Can you fix it please?",
      candidateText:
        "Yeah, that's a good idea. Here's what I'd do next.",
      actionEvidence: [],
      verification: completeVerification,
    });

    expect(result.complete).toBe(false);
    expect(result.unresolvedWork).toContain(
      "execute the already-authorized safe reversible in-scope action before stopping",
    );
    expect(result.behaviorViolations).toContain(
      "judgment_replaced_execution",
    );
    expect(result.strategyCorrection).toContain(
      "Judgment, recommendations, and options may accompany execution",
    );
  });

  it("allows judgment after actual execution evidence exists", () => {
    expect(
      shouldForceExecutionContinuation({
        goal: "Please update it",
        candidateText:
          "That was the right move. I can adjust more if you want.",
        actionEvidence: [
          "capability update_file completed successfully",
        ],
      }),
    ).toBe(false);
  });

  it("allows inline code to be the delivered action", () => {
    expect(
      shouldForceExecutionContinuation({
        goal: "Can you code it please?",
        candidateText: [
          "Yep. Here's how I'd do it:",
          "```ts",
          "export const fixed = true;",
          "```",
        ].join("\n"),
        actionEvidence: [],
      }),
    ).toBe(false);
  });

  it("does not let a direct code request end at another permission loop", () => {
    expect(
      shouldForceExecutionContinuation({
        goal: "Can you code it please?",
        candidateText:
          "Absolutely. I can code that next if you want.",
        actionEvidence: [],
      }),
    ).toBe(true);
  });
});

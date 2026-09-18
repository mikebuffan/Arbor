import { describe, expect, it } from "vitest";
import type { AgencyState } from "../engine";
import { choosePriorAgency, resumableAgency } from "../session";

function state(revision: number, nextAction: string, status: AgencyState["status"] = "active"): AgencyState {
  return {
    goal: "make Arbor permanent",
    status,
    currentStep: revision,
    unresolvedWork: [nextAction],
    recurringWeaknesses: [],
    strategyNotes: [],
    blocker: null,
    objective: {
      parentGoal: "make Arbor permanent",
      completionCriteria: ["verified"],
      standingAuthorization: ["safe reversible work"],
      hardStops: ["deploy"],
      nextAction,
      checkpoint: `revision ${revision}`,
      status: status === "complete" ? "complete" : status === "blocked" ? "blocked" : "active",
      revision,
    },
  };
}

describe("canonical agency carrier selection", () => {
  it("rejects an older conversation checkpoint", () => {
    const project = state(10, "new project step");
    const oldThread = state(7, "stale thread step");
    expect(choosePriorAgency(project, oldThread)?.objective?.nextAction).toBe(
      "new project step",
    );
  });

  it("allows a conversation checkpoint only when it is at least as new", () => {
    const project = state(10, "project step");
    const thread = state(11, "newer thread step");
    expect(choosePriorAgency(project, thread)?.objective?.nextAction).toBe(
      "newer thread step",
    );
  });

  it("treats execution checkpoints as resumable work", () => {
    expect(resumableAgency(state(4, "resume me", "checkpointed"))?.status).toBe(
      "checkpointed",
    );
  });
});

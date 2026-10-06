import { describe, expect, it, vi } from "vitest";
import type { AgencyState } from "../engine";
import { splitAgencyWork } from "../openLoops";
import { buildAgencySessionState } from "../session";
import { AgencyStateConflictError } from "../state";

const prior: AgencyState = {
  goal: "finish One Arbor reconciliation",
  status: "active",
  currentStep: 12,
  unresolvedWork: ["reconcile memory", "reconcile body"],
  recurringWeaknesses: ["lost open loop after interruption"],
  strategyNotes: ["continue safe unfinished work automatically"],
  blocker: null,
  objective: {
    parentGoal: "finish One Arbor reconciliation",
    completionCriteria: ["verified"],
    standingAuthorization: ["continue safe reversible work"],
    hardStops: ["external authority"],
    nextAction: "reconcile memory",
    checkpoint: "step 12",
    status: "active",
    revision: 9,
    execution: null,
  },
};

describe("agency interruption ownership", () => {
  it("treats an unrelated turn as foreground without cancelling prior work", () => {
    const next = buildAgencySessionState({
      userText: "What did you find?",
      prior,
      checkpointId: "interrupt-1",
      now: "2026-10-01T18:00:00.000Z",
    });
    const work = splitAgencyWork(next.unresolvedWork);
    expect(next.goal).toBe("What did you find?");
    expect(work.current).toEqual(["complete goal: What did you find?"]);
    expect(work.suspended[0].checkpoint.goal).toBe(prior.goal);
    expect(next.objective?.revision).toBe(10);
  });

  it("resumes explicit continuation without duplicating a checkpoint", () => {
    const next = buildAgencySessionState({ userText: "go", prior });
    expect(next.goal).toBe(prior.goal);
    expect(next.currentStep).toBe(prior.currentStep);
    expect(splitAgencyWork(next.unresolvedWork).suspended).toHaveLength(0);
  });

  it("honors explicit supersession", () => {
    const next = buildAgencySessionState({
      userText: "Drop that. New task: inspect deployment",
      prior,
    });
    expect(splitAgencyWork(next.unresolvedWork).suspended).toHaveLength(0);
  });
  it("defines CAS conflict as a recoverable concurrency condition", () => {
    const error = new AgencyStateConflictError();
    expect(error.name).toBe("AgencyStateConflictError");
    expect(error.message).toBe("agency_state_conflict");
  });
});

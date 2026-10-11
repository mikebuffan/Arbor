import { describe, expect, it } from "vitest";
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

  it("resumes the same goal after a conversational pause checkpoint without losing progress or grants", () => {
    const paused: AgencyState = {
      ...prior,
      status: "checkpointed",
      objective: {
        ...prior.objective!,
        status: "checkpointed",
        checkpoint: "explicit_user_conversation_control",
        revision: 10,
      },
    };
    const resumed = buildAgencySessionState({ userText: "go", prior: paused });
    expect(resumed.goal).toBe(prior.goal);
    expect(resumed.currentStep).toBe(prior.currentStep);
    expect(resumed.unresolvedWork).toEqual(prior.unresolvedWork);
    expect(resumed.status).toBe("active");
    expect(resumed.objective?.revision).toBe(11);
    expect(resumed.objective?.standingAuthorization).toEqual(prior.objective?.standingAuthorization);
    expect(resumed.objective?.hardStops).toEqual(prior.objective?.hardStops);
    expect(splitAgencyWork(resumed.unresolvedWork).suspended).toHaveLength(0);
  });

  it("keeps an existing protected blocker after a control turn, even if the user later says go", () => {
    const priorBlocked: AgencyState = {
      ...prior,
      status: "blocked",
      blocker: "external_authority",
      objective: { ...prior.objective!, status: "blocked" },
    };
    const next = buildAgencySessionState({ userText: "go", prior: priorBlocked });
    expect(next.status).toBe("blocked");
    expect(next.blocker).toBe("external_authority");
    expect(next.objective?.status).toBe("blocked");
    expect(next.unresolvedWork).toEqual(priorBlocked.unresolvedWork);
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

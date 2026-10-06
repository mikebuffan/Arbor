import { describe, expect, it } from "vitest";
import {
  RESEARCH_WAKE_MAX_NO_PROGRESS,
  RESEARCH_WAKE_MAX_PULSES,
  decideResearchWake,
  initialResearchWakeState,
} from "./researchWakePolicy";
import type { ResearchControllerPulseResult } from "./researchController";

const checkpointed: ResearchControllerPulseResult = {
  status: "checkpointed",
  plan: "run_next",
  appendedUnits: 0,
  checkpoint: {
    kind: "research_checkpoint",
    ownerId: "owner",
    projectId: "project",
    sessionId: "session",
    objectiveId: "objective",
    authorizationVersion: "1",
    status: "committed",
    unitId: "unit",
    idempotencyKey: "unit-key",
    receiptStatus: "completed",
    evidenceRefs: ["synthetic:evidence"],
    unresolvedRequiredWork: 2,
    costCents: 0,
    independentCorroborationVerified: false,
    grantsExecution: false,
    completionVerified: false,
  },
};

describe("research wake policy", () => {
  it("resumes after a durable progress checkpoint and clears no-progress streak", () => {
    expect(decideResearchWake({
      pulse: checkpointed,
      state: { pulseCount: 7, consecutiveNoProgress: 4 },
    })).toMatchObject({
      action: "resume",
      delaySeconds: 30,
      reason: "progress_checkpointed",
      state: { pulseCount: 8, consecutiveNoProgress: 0 },
    });
  });

  it("retries temporary no-claim without spinning forever", () => {
    const pulse: ResearchControllerPulseResult = {
      status: "no_claim",
      plan: "run_next",
      appendedUnits: 0,
      reason: "temporary lease fence",
    };
    expect(decideResearchWake({
      pulse,
      state: initialResearchWakeState(),
    })).toMatchObject({
      action: "resume",
      reason: "temporary_no_claim",
      state: { pulseCount: 1, consecutiveNoProgress: 1 },
    });

    expect(decideResearchWake({
      pulse,
      state: {
        pulseCount: 20,
        consecutiveNoProgress: RESEARCH_WAKE_MAX_NO_PROGRESS - 1,
      },
    })).toEqual({
      action: "stop",
      state: {
        pulseCount: 21,
        consecutiveNoProgress: RESEARCH_WAKE_MAX_NO_PROGRESS,
      },
      reason: "no_progress_limit",
    });
  });

  it("retries lease loss as no-progress rather than calling it evidence", () => {
    expect(decideResearchWake({
      pulse: {
        status: "lease_lost",
        plan: "run_next",
        appendedUnits: 0,
        reason: "research_lease_not_committed",
      },
      state: initialResearchWakeState(),
    })).toMatchObject({
      action: "resume",
      reason: "lease_lost_retry",
      state: { consecutiveNoProgress: 1 },
    });
  });

  it.each([
    [{ status: "awaiting_review", reason: "review", unresolvedWork: ["review"] }, "awaiting_review"],
    [{ status: "blocked", reason: "boundary", unresolvedWork: ["boundary"] }, "blocked"],
    [{ status: "stopped", reason: "cancelled_by_owner" }, "session_stopped"],
    [{ status: "idle", reason: "session_not_started" }, "session_idle"],
    [{ status: "not_found" }, "session_not_found"],
  ] as const)("stops for terminal/controller boundary %#", (pulse, reason) => {
    expect(decideResearchWake({
      pulse: pulse as ResearchControllerPulseResult,
      state: initialResearchWakeState(),
    })).toMatchObject({ action: "stop", reason });
  });

  it("caps even productive wake loops", () => {
    expect(decideResearchWake({
      pulse: checkpointed,
      state: {
        pulseCount: RESEARCH_WAKE_MAX_PULSES - 1,
        consecutiveNoProgress: 0,
      },
    })).toEqual({
      action: "stop",
      state: {
        pulseCount: RESEARCH_WAKE_MAX_PULSES,
        consecutiveNoProgress: 0,
      },
      reason: "pulse_limit",
    });
  });
});

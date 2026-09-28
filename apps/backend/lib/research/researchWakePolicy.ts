import type { ResearchControllerPulseResult } from "./researchController";

export const RESEARCH_WAKE_PROGRESS_DELAY_SECONDS = 30;
export const RESEARCH_WAKE_RETRY_DELAY_SECONDS = 30;
export const RESEARCH_WAKE_MAX_NO_PROGRESS = 12;
export const RESEARCH_WAKE_MAX_PULSES = 1000;

export type ResearchWakeState = {
  pulseCount: number;
  consecutiveNoProgress: number;
};

export type ResearchWakeDecision =
  | {
      action: "resume";
      delaySeconds: number;
      state: ResearchWakeState;
      reason: "progress_checkpointed" | "temporary_no_claim" | "lease_lost_retry";
    }
  | {
      action: "stop";
      state: ResearchWakeState;
      reason:
        | "awaiting_review"
        | "blocked"
        | "session_stopped"
        | "session_idle"
        | "session_not_found"
        | "no_progress_limit"
        | "pulse_limit";
    };

export function initialResearchWakeState(): ResearchWakeState {
  return { pulseCount: 0, consecutiveNoProgress: 0 };
}

/**
 * Pure wake policy for a future durable workflow/queue adapter.
 *
 * It grants no research authority, does not inspect evidence, does not create
 * tasks and does not schedule itself. The external durable wake provider may
 * sleep for the returned delay and invoke exactly one more controller pulse.
 * Every pulse independently reloads session authorization/deadline/STOP state.
 */
export function decideResearchWake(input: {
  pulse: ResearchControllerPulseResult;
  state: ResearchWakeState;
}): ResearchWakeDecision {
  const pulseCount = input.state.pulseCount + 1;

  if (pulseCount >= RESEARCH_WAKE_MAX_PULSES) {
    return {
      action: "stop",
      state: {
        pulseCount,
        consecutiveNoProgress: input.state.consecutiveNoProgress,
      },
      reason: "pulse_limit",
    };
  }

  if (input.pulse.status === "checkpointed") {
    return {
      action: "resume",
      delaySeconds: RESEARCH_WAKE_PROGRESS_DELAY_SECONDS,
      state: { pulseCount, consecutiveNoProgress: 0 },
      reason: "progress_checkpointed",
    };
  }

  if (input.pulse.status === "no_claim" ||
      input.pulse.status === "lease_lost") {
    const consecutiveNoProgress = input.state.consecutiveNoProgress + 1;

    if (consecutiveNoProgress >= RESEARCH_WAKE_MAX_NO_PROGRESS) {
      return {
        action: "stop",
        state: { pulseCount, consecutiveNoProgress },
        reason: "no_progress_limit",
      };
    }

    return {
      action: "resume",
      delaySeconds: RESEARCH_WAKE_RETRY_DELAY_SECONDS,
      state: { pulseCount, consecutiveNoProgress },
      reason: input.pulse.status === "lease_lost"
        ? "lease_lost_retry"
        : "temporary_no_claim",
    };
  }

  const state = {
    pulseCount,
    consecutiveNoProgress: input.state.consecutiveNoProgress,
  };

  if (input.pulse.status === "awaiting_review") {
    return { action: "stop", state, reason: "awaiting_review" };
  }
  if (input.pulse.status === "blocked") {
    return { action: "stop", state, reason: "blocked" };
  }
  if (input.pulse.status === "stopped") {
    return { action: "stop", state, reason: "session_stopped" };
  }
  if (input.pulse.status === "idle") {
    return { action: "stop", state, reason: "session_idle" };
  }
  return { action: "stop", state, reason: "session_not_found" };
}

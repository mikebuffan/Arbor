import type { ArborWorkState } from "./workState";

export type ArborWorkPriority = {
  workId: string;
  score: number;
  reasons: string[];
};

const ACTIVE_STATUS_WEIGHT: Record<ArborWorkState["status"], number> = {
  open: 1,
  investigating: 2,
  repairing: 3,
  verifying: 2,
  blocked: 1,
  resolved: -10,
  reverted: -2,
};

export function scoreWorkState(state: ArborWorkState): ArborWorkPriority {
  const reasons: string[] = [];
  let score = ACTIVE_STATUS_WEIGHT[state.status];

  const evidenceStrength = state.evidence.reduce(
    (sum, item) => sum + item.confidence,
    0,
  );
  score += evidenceStrength;

  if (state.evidence.length >= 2) {
    score += 1;
    reasons.push("recurring evidence");
  }

  const subsystemCount = new Set(state.affectedSubsystems).size;
  if (subsystemCount >= 2) {
    score += subsystemCount;
    reasons.push("cross-subsystem impact");
  }

  if (state.nextAction) {
    score += 0.5;
    reasons.push("actionable next step");
  }

  if (
    state.hypothesisConfidence != null &&
    state.hypothesisConfidence >= 0.75
  ) {
    score += 1;
    reasons.push("strong working hypothesis");
  }

  if (state.status === "resolved") {
    reasons.push("already resolved");
  }

  return {
    workId: state.id,
    score,
    reasons,
  };
}

export function prioritizeWork(
  states: ArborWorkState[],
): ArborWorkState[] {
  return [...states].sort((a, b) => {
    const delta = scoreWorkState(b).score - scoreWorkState(a).score;
    if (delta !== 0) return delta;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function chooseNextWork(
  states: ArborWorkState[],
): ArborWorkState | null {
  return prioritizeWork(states).find(
    (state) => state.status !== "resolved",
  ) ?? null;
}

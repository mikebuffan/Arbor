import type {
  ArborWorkEvidence,
  ArborWorkState,
} from "./workState";

export type ArborWorkPriority = {
  workId: string;
  score: number;
  reasons: string[];
};

const ACTIVE_STATUS_WEIGHT: Record<
  ArborWorkState["status"],
  number
> = {
  open: 5,
  investigating: 10,
  repairing: 15,
  verifying: 8,
  blocked: 12,
  resolved: 0,
  reverted: 0,
};

function averageConfidence(
  evidence: ArborWorkEvidence[],
): number {
  if (!evidence.length) return 0;

  return (
    evidence.reduce(
      (sum, item) => sum + item.confidence,
      0,
    ) / evidence.length
  );
}

function distinctSources(
  evidence: ArborWorkEvidence[],
): number {
  return new Set(
    evidence.map((item) => item.source),
  ).size;
}

export function scoreWorkState(
  state: ArborWorkState,
): ArborWorkPriority {
  if (
    state.status === "resolved" ||
    state.status === "reverted"
  ) {
    return {
      workId: state.id,
      score: 0,
      reasons: ["work is closed"],
    };
  }

  let score =
    ACTIVE_STATUS_WEIGHT[state.status];

  const reasons: string[] = [];
  const confidence =
    averageConfidence(state.evidence);
  const sourceCount =
    distinctSources(state.evidence);
  const subsystemCount =
    new Set(state.affectedSubsystems).size;

  if (state.evidence.length >= 2) {
    score += 20;
    reasons.push("recurring evidence");
  }

  if (sourceCount >= 2) {
    score += 20;
    reasons.push("cross-source evidence");
  }

  if (subsystemCount >= 2) {
    score += 25;
    reasons.push("cross-subsystem impact");
  }

  if (confidence >= 0.8) {
    score += 15;
    reasons.push("high-confidence evidence");
  } else if (confidence >= 0.5) {
    score += 8;
    reasons.push("moderate-confidence evidence");
  }

  if (state.nextAction) {
    score += 5;
    reasons.push("actionable next step");
  } else {
    score -= 10;
    reasons.push("missing next action");
  }

  if (
    state.hypothesisConfidence != null &&
    state.hypothesisConfidence >= 0.75
  ) {
    score += 5;
    reasons.push("strong working hypothesis");
  }

  if (state.status === "blocked") {
    score += 10;
    reasons.push("blocked active work");
  }

  if (state.status === "verifying") {
    score += 5;
    reasons.push("verification should finish");
  }

  return {
    workId: state.id,
    score: Math.max(0, score),
    reasons,
  };
}

export function prioritizeWork(
  states: ArborWorkState[],
): ArborWorkState[] {
  return [...states].sort((a, b) => {
    const delta =
      scoreWorkState(b).score -
      scoreWorkState(a).score;

    if (delta !== 0) return delta;

    return b.updatedAt.localeCompare(
      a.updatedAt,
    );
  });
}

export function chooseNextWork(
  states: ArborWorkState[],
): ArborWorkState | null {
  return (
    prioritizeWork(states).find(
      (state) =>
        state.status !== "resolved" &&
        state.status !== "reverted" &&
        scoreWorkState(state).score > 0,
    ) ?? null
  );
}

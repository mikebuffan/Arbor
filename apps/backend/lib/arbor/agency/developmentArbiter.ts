import type {
  ArborWorkEvidence,
  ArborWorkState,
} from "./workState";

export type ArborWorkPriority = {
  workId: string;
  score: number;
  reasons: string[];
};

function averageConfidence(evidence: ArborWorkEvidence[]): number {
  if (!evidence.length) return 0;
  return (
    evidence.reduce((sum, item) => sum + item.confidence, 0) /
    evidence.length
  );
}

function distinctSources(evidence: ArborWorkEvidence[]): number {
  return new Set(evidence.map((item) => item.source)).size;
}

export function scoreWorkState(
  state: ArborWorkState,
): ArborWorkPriority {
  if (state.status === "resolved" || state.status === "reverted") {
    return {
      workId: state.id,
      score: 0,
      reasons: ["work is closed"],
    };
  }

  let score = 0;
  const reasons: string[] = [];
  const confidence = averageConfidence(state.evidence);
  const sourceCount = distinctSources(state.evidence);
  const subsystemCount = new Set(state.affectedSubsystems).size;

  if (state.evidence.length >= 2) {
    score += 20;
    reasons.push("repeated evidence");
  }

  if (sourceCount >= 2) {
    score += 20;
    reasons.push("cross-source evidence");
  }

  if (subsystemCount >= 2) {
    score += 25;
    reasons.push("cross-subsystem blast radius");
  }

  if (confidence >= 0.8) {
    score += 15;
    reasons.push("high-confidence evidence");
  } else if (confidence >= 0.5) {
    score += 8;
    reasons.push("moderate-confidence evidence");
  }

  if (state.status === "blocked") {
    score += 15;
    reasons.push("blocked active work");
  }

  if (state.status === "verifying") {
    score += 5;
    reasons.push("verification should finish");
  }

  if (!state.nextAction) {
    score -= 10;
    reasons.push("missing next action");
  }

  return {
    workId: state.id,
    score: Math.max(0, score),
    reasons,
  };
}

export function rankWorkStates(
  states: ArborWorkState[],
): ArborWorkPriority[] {
  return states
    .map(scoreWorkState)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.workId.localeCompare(b.workId),
    );
}

export function chooseNextWork(
  states: ArborWorkState[],
): ArborWorkState | null {
  const ranked = rankWorkStates(states);
  const winner = ranked.find((item) => item.score > 0);

  if (!winner) return null;

  return states.find((state) => state.id === winner.workId) ?? null;
}

import type {
  ArborState,
  StrategyCandidate,
} from "./types.js";

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function observeStrategy(
  state: ArborState,
  strategy: string,
  verificationPassed: boolean,
): ArborState {
  const normalized = clean(strategy);

  if (!normalized) return state;

  const candidates = [
    ...(state.strategyCandidates ?? []),
  ];

  const index = candidates.findIndex(
    (candidate) => candidate.strategy === normalized,
  );

  const current: StrategyCandidate =
    index >= 0
      ? candidates[index]
      : {
          strategy: normalized,
          successes: 0,
          failures: 0,
          status: "candidate",
        };

  if (current.status !== "candidate") {
    return state;
  }

  const next: StrategyCandidate = {
    ...current,
    successes:
      current.successes +
      (verificationPassed ? 1 : 0),
    failures:
      current.failures +
      (verificationPassed ? 0 : 1),
  };

  if (
    next.successes >= 2 &&
    next.failures === 0
  ) {
    next.status = "retained";
  }

  if (next.failures >= 2) {
    next.status = "reverted";
  }

  if (index >= 0) {
    candidates[index] = next;
  } else {
    candidates.push(next);
  }

  const strategyNotes =
    next.status === "retained"
      ? Array.from(
          new Set([
            ...state.strategyNotes,
            normalized,
          ]),
        ).slice(-20)
      : state.strategyNotes.filter(
          (item) => item !== normalized,
        );

  return {
    ...state,
    strategyNotes,
    strategyCandidates: candidates.slice(-40),
  };
}

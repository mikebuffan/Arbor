import {
  SELF_UPDATE_RETENTION_THRESHOLD,
  SELF_UPDATE_REVERT_THRESHOLD,
  assessSelfUpdateStrategy,
} from "./fireflyCode.js";
import type {
  ArborState,
  StrategyCandidate,
} from "./types.js";

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export type StrategyObservation = {
  verificationId?: string;
};

export function observeStrategy(
  state: ArborState,
  strategy: string,
  verificationPassed: boolean,
  observation: StrategyObservation = {},
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
          verificationIds: [],
        };

  if (current.status === "reverted") {
    return state;
  }

  const assessment = assessSelfUpdateStrategy(normalized);

  if (!assessment.allowed) {
    const rejected: StrategyCandidate = {
      ...current,
      status: "reverted",
      rejectionReason: assessment.reason ?? "protected_core_mutation",
    };

    if (index >= 0) {
      candidates[index] = rejected;
    } else {
      candidates.push(rejected);
    }

    return {
      ...state,
      strategyNotes: state.strategyNotes.filter(
        (item) => item !== normalized,
      ),
      strategyCandidates: candidates.slice(-40),
    };
  }

  const verificationId = clean(
    observation.verificationId ??
      `legacy:${verificationPassed ? "pass" : "fail"}:${current.successes + current.failures + 1}`,
  );

  const evidenceKey =
    `${verificationPassed ? "pass" : "fail"}:${verificationId}`;

  const priorVerificationIds =
    current.verificationIds ?? [];

  if (priorVerificationIds.includes(evidenceKey)) {
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
    verificationIds: [
      ...priorVerificationIds,
      evidenceKey,
    ].slice(-20),
    rejectionReason: undefined,
  };

  if (
    next.successes >= SELF_UPDATE_RETENTION_THRESHOLD &&
    next.failures === 0
  ) {
    next.status = "retained";
  }

  if (next.failures >= SELF_UPDATE_REVERT_THRESHOLD) {
    next.status = "reverted";
    next.rejectionReason = "repeated_verification_failure";
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

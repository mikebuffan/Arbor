import {
  dedupeEvidenceByOrigin,
  evaluateIndependentSupport,
  type CognitionEvidenceEvent,
} from "./cognition/evidence.js";
import type {
  ArborState,
  StrategyCandidate,
} from "./types.js";

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export type StrategyObservationEvidence = {
  sourceId: string;
  originId: string;
  occurredAt: string;
};

export function observeStrategy(
  state: ArborState,
  strategy: string,
  verificationPassed: boolean,
  evidence?: StrategyObservationEvidence,
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
          evidenceEvents: [],
        };

  if (current.status !== "candidate") {
    return state;
  }

  const event: CognitionEvidenceEvent | null =
    evidence
      ? {
          subject: "arbor",
          attribute: `strategy:${normalized}`,
          evidenceClass: "observed",
          sourceId: evidence.sourceId,
          originId: evidence.originId,
          occurredAt: evidence.occurredAt,
          supports: verificationPassed,
          independentlyObserved: true,
        }
      : null;

  const evidenceEvents = event
    ? dedupeEvidenceByOrigin([
        ...(current.evidenceEvents ?? []),
        event,
      ])
    : (current.evidenceEvents ?? []);

  const successes =
    evidenceEvents.filter((item) => item.supports).length;
  const failures =
    evidenceEvents.filter((item) => !item.supports).length;

  const next: StrategyCandidate = {
    ...current,
    successes:
      evidence ? successes : current.successes + (verificationPassed ? 1 : 0),
    failures:
      evidence ? failures : current.failures + (verificationPassed ? 0 : 1),
    evidenceEvents,
  };

  const independentSupport =
    evidenceEvents.length
      ? evaluateIndependentSupport(evidenceEvents)
      : null;

  if (
    independentSupport?.qualifies &&
    next.failures === 0
  ) {
    next.status = "retained";
  }

  // No provenance, no durable promotion. Legacy anonymous verification may
  // update candidate counters for compatibility, but cannot establish a
  // durable retained strategy.
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

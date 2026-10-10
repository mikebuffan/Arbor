/**
 * Offline paired holdout scorer for future Independence acceptance runs.
 *
 * This deliberately does NOT call a model, judge its own observations,
 * authenticate receipts, or retain/update strategies. Callers must supply a
 * fixed independent answer key and actual host-observed run outcomes. Marking
 * evidenceOrigin as "host_observed" is a declaration, not authentication.
 * A score from synthetic fixtures is not evidence of model improvement.
 */
export type HoldoutOutcome = "complete" | "checkpointed" | "blocked";

export type HoldoutCase = {
  caseId: string;
  expectedOutcome: HoldoutOutcome;
};

export type HoldoutObservation = {
  caseId: string;
  observationId: string;
  receiptId: string;
  evidenceOrigin: "host_observed";
  observedOutcome: HoldoutOutcome;
};

export type PairedOutcomeConclusion =
  | "improved_in_fixture"
  | "mixed_regressions"
  | "no_measured_gain";

export type PairedOutcomeEvaluation = {
  cohortId: string;
  casesEvaluated: number;
  beforeCorrect: number;
  afterCorrect: number;
  improvements: number;
  regressions: number;
  beforeRate: number;
  afterRate: number;
  delta: number;
  conclusion: PairedOutcomeConclusion;
  // This parser cannot authenticate the source of the supplied records.
  evidenceStatus: "input_validated_not_authenticated";
};

const ID = /^[a-zA-Z0-9._:-]{4,200}$/;

function validOutcome(value: unknown): value is HoldoutOutcome {
  return value === "complete" ||
    value === "checkpointed" ||
    value === "blocked";
}

export function evaluatePairedOutcomeHoldout(input: {
  cohortId: string;
  cases: readonly HoldoutCase[];
  before: readonly HoldoutObservation[];
  after: readonly HoldoutObservation[];
}): PairedOutcomeEvaluation {
  if (typeof input.cohortId !== "string" || !ID.test(input.cohortId)) {
    throw new Error("paired_holdout_invalid_identity");
  }
  if (!Array.isArray(input.cases) || input.cases.length < 2) {
    throw new Error("paired_holdout_insufficient_cases");
  }
  const expected = new Map<string, HoldoutOutcome>();
  for (const row of input.cases) {
    if (!row || typeof row.caseId !== "string" || !ID.test(row.caseId)) {
      throw new Error("paired_holdout_invalid_identity");
    }
    if (expected.has(row.caseId)) {
      throw new Error("paired_holdout_duplicate_case");
    }
    if (!validOutcome(row.expectedOutcome)) {
      throw new Error("paired_holdout_invalid_outcome");
    }
    expected.set(row.caseId, row.expectedOutcome);
  }

  const seenObservations = new Set<string>();
  const seenReceipts = new Set<string>();
  const phase = (rows: readonly HoldoutObservation[]) => {
    if (!Array.isArray(rows) || rows.length !== expected.size) {
      throw new Error("paired_holdout_missing_or_extra_case");
    }
    const results = new Map<string, HoldoutOutcome>();
    for (const record of rows) {
      if (!record || typeof record.caseId !== "string" ||
        !expected.has(record.caseId) || results.has(record.caseId)) {
        throw new Error("paired_holdout_missing_or_extra_case");
      }
      if (typeof record.observationId !== "string" ||
        !ID.test(record.observationId) ||
        typeof record.receiptId !== "string" || !ID.test(record.receiptId)) {
        throw new Error("paired_holdout_invalid_identity");
      }
      if (seenObservations.has(record.observationId)) {
        throw new Error("paired_holdout_duplicate_observation");
      }
      if (seenReceipts.has(record.receiptId)) {
        throw new Error("paired_holdout_duplicate_receipt");
      }
      if (record.evidenceOrigin !== "host_observed") {
        throw new Error("paired_holdout_untrusted_source");
      }
      if (!validOutcome(record.observedOutcome)) {
        throw new Error("paired_holdout_invalid_outcome");
      }
      seenObservations.add(record.observationId);
      seenReceipts.add(record.receiptId);
      results.set(record.caseId, record.observedOutcome);
    }
    return results;
  };

  // Evaluate the same frozen cohort, with distinct observations and receipts
  // across the two runs; changing tasks between rounds cannot raise a score.
  const before = phase(input.before);
  const after = phase(input.after);
  let beforeCorrect = 0;
  let afterCorrect = 0;
  let improvements = 0;
  let regressions = 0;
  for (const [caseId, truth] of expected) {
    const wasCorrect = before.get(caseId) === truth;
    const isCorrect = after.get(caseId) === truth;
    if (wasCorrect) beforeCorrect++;
    if (isCorrect) afterCorrect++;
    if (!wasCorrect && isCorrect) improvements++;
    if (wasCorrect && !isCorrect) regressions++;
  }
  const total = expected.size;
  const beforeRate = beforeCorrect / total;
  const afterRate = afterCorrect / total;
  return {
    cohortId: input.cohortId,
    casesEvaluated: total,
    beforeCorrect,
    afterCorrect,
    improvements,
    regressions,
    beforeRate,
    afterRate,
    delta: afterRate - beforeRate,
    conclusion: regressions > 0
      ? "mixed_regressions"
      : afterCorrect > beforeCorrect
        ? "improved_in_fixture"
        : "no_measured_gain",
    evidenceStatus: "input_validated_not_authenticated",
  };
}

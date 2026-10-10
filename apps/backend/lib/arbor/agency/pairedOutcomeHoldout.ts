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

/**
 * Caller-declared run provenance. The scorer checks fair comparison; it
 * cannot authenticate a run identity, source control state, or its receipts.
 */
export type HoldoutRunMetadata = {
  runId: string;
  phase: "before" | "after";
  cohortRevision: string;
  protocolId: string;
  modelId: string;
  toolScopeId: string;
  maxRounds: number;
  maxToolCalls: number;
  strategyRevision: string;
};

export type PairedOutcomeConclusion =
  | "improved_in_fixture"
  | "mixed_regressions"
  | "no_measured_gain";

export type PairedOutcomeEvaluation = {
  cohortId: string;
  cohortRevision: string;
  protocolId: string;
  modelId: string;
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

function validIdentity(value: unknown): value is string {
  return typeof value === "string" && ID.test(value);
}

function validateComparableRuns(
  before: HoldoutRunMetadata,
  after: HoldoutRunMetadata,
): void {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") {
    throw new Error("paired_holdout_run_metadata_required");
  }
  const fields: (keyof HoldoutRunMetadata)[] = [
    "runId", "cohortRevision", "protocolId", "modelId",
    "toolScopeId", "strategyRevision",
  ];
  for (const run of [before, after]) {
    if (fields.some((field) => !validIdentity(run[field])) ||
        !Number.isSafeInteger(run.maxRounds) ||
        run.maxRounds < 1 || run.maxRounds > 128 ||
        !Number.isSafeInteger(run.maxToolCalls) ||
        run.maxToolCalls < 0 || run.maxToolCalls > 512) {
      throw new Error("paired_holdout_invalid_run");
    }
  }
  if (before.phase !== "before" || after.phase !== "after") {
    throw new Error("paired_holdout_phase_mismatch");
  }
  if (before.runId === after.runId) {
    throw new Error("paired_holdout_duplicate_run");
  }
  if (before.strategyRevision === after.strategyRevision) {
    throw new Error("paired_holdout_no_strategy_change");
  }
  const equalProtocolFields: (keyof HoldoutRunMetadata)[] = [
    "cohortRevision", "protocolId", "modelId",
    "toolScopeId", "maxRounds", "maxToolCalls",
  ];
  if (equalProtocolFields.some((field) => before[field] !== after[field])) {
    throw new Error("paired_holdout_protocol_mismatch");
  }
}

function validOutcome(value: unknown): value is HoldoutOutcome {
  return value === "complete" ||
    value === "checkpointed" ||
    value === "blocked";
}

export function evaluatePairedOutcomeHoldout(input: {
  cohortId: string;
  beforeRun: HoldoutRunMetadata;
  afterRun: HoldoutRunMetadata;
  cases: readonly HoldoutCase[];
  before: readonly HoldoutObservation[];
  after: readonly HoldoutObservation[];
}): PairedOutcomeEvaluation {
  if (typeof input.cohortId !== "string" || !ID.test(input.cohortId)) {
    throw new Error("paired_holdout_invalid_identity");
  }
  // Never turn a changed model, tool grant, execution budget, or
  // scoring protocol into an apparent strategy improvement.
  validateComparableRuns(input.beforeRun, input.afterRun);
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
    cohortRevision: input.beforeRun.cohortRevision,
    protocolId: input.beforeRun.protocolId,
    modelId: input.beforeRun.modelId,
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

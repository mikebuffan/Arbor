import {
  evaluatePairedOutcomeHoldout,
  type HoldoutOutcome,
  type PairedOutcomeEvaluation,
} from "./pairedOutcomeHoldout";

/**
 * Caller-supplied fields from a separate host result readback.
 * A declared host_readback source is NOT authenticated by this pure function.
 * Fetching and validating real host storage is a separate acceptance step.
 */
export type RecordedOutcomeReceipt = {
  receiptId: string;
  observationId: string;
  runId: string;
  caseId: string;
  eventId: string;
  recordedOutcome: HoldoutOutcome;
  source: "host_readback";
  status: "confirmed";
};

export type ReconciledPairedOutcomeEvaluation =
  Omit<PairedOutcomeEvaluation, "evidenceStatus"> & {
    reconciledReceipts: number;
    evidenceStatus: "receipt_fields_reconciled_not_authenticated";
  };

const ID = /^[A-Za-z0-9._:-]{4,200}$/;
const isId = (x: unknown): x is string =>
  typeof x === "string" && ID.test(x);

/**
 * Offline one-to-one cross-check of each claimed paired outcome against
 * a separately supplied host readback record. The existing paired scorer
 * still controls cohort, comparison protocol, phase and outcome scoring.
 *
 * This is read-only and cannot mark any strategy retained or declare
 * authenticated real-world learning based on synthetic input.
 */
export function evaluateHoldoutWithRecordedReceipts(
  input: Parameters<typeof evaluatePairedOutcomeHoldout>[0] & {
    recordedReceipts: readonly RecordedOutcomeReceipt[];
  },
): ReconciledPairedOutcomeEvaluation {
  const evaluation = evaluatePairedOutcomeHoldout(input);

  const expected = new Map<string, {
    observationId: string;
    runId: string;
    caseId: string;
    observedOutcome: HoldoutOutcome;
  }>();
  for (const [run, observations] of [
    [input.beforeRun, input.before],
    [input.afterRun, input.after],
  ] as const) {
    for (const observation of observations) {
      expected.set(observation.receiptId, {
        observationId: observation.observationId,
        runId: run.runId,
        caseId: observation.caseId,
        observedOutcome: observation.observedOutcome,
      });
    }
  }

  if (!Array.isArray(input.recordedReceipts) ||
      input.recordedReceipts.length !== expected.size) {
    throw new Error("paired_receipt_incomplete_coverage");
  }

  const seenReceipts = new Set<string>();
  const seenHostEvents = new Set<string>();
  for (const receipt of input.recordedReceipts) {
    if (!receipt ||
        !isId(receipt.receiptId) ||
        !isId(receipt.observationId) ||
        !isId(receipt.runId) ||
        !isId(receipt.caseId) ||
        !isId(receipt.eventId)) {
      throw new Error("paired_receipt_invalid_identity");
    }
    if (seenReceipts.has(receipt.receiptId)) {
      throw new Error("paired_receipt_duplicate_receipt");
    }
    if (seenHostEvents.has(receipt.eventId)) {
      throw new Error("paired_receipt_duplicate_host_event");
    }
    if (receipt.source !== "host_readback" ||
        receipt.status !== "confirmed") {
      throw new Error("paired_receipt_unconfirmed_source");
    }
    const observation = expected.get(receipt.receiptId);
    if (!observation) {
      throw new Error("paired_receipt_unmatched_receipt");
    }
    if (observation.observationId !== receipt.observationId ||
        observation.runId !== receipt.runId ||
        observation.caseId !== receipt.caseId) {
      throw new Error("paired_receipt_binding_mismatch");
    }
    if (observation.observedOutcome !== receipt.recordedOutcome) {
      throw new Error("paired_receipt_outcome_mismatch");
    }
    seenReceipts.add(receipt.receiptId);
    seenHostEvents.add(receipt.eventId);
  }

  if (seenReceipts.size !== expected.size) {
    throw new Error("paired_receipt_incomplete_coverage");
  }

  return {
    ...evaluation,
    reconciledReceipts: seenReceipts.size,
    evidenceStatus: "receipt_fields_reconciled_not_authenticated",
  };
}

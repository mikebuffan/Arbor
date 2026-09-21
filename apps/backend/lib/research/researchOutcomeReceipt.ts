export const researchOutcomeKinds = [
  "rejected_hypothesis",
  "missing_data",
  "extraction_failure",
] as const;

export type ResearchOutcomeKind = (typeof researchOutcomeKinds)[number];

export type ResearchOutcomeReceipt = {
  receiptId: string;
  kind: ResearchOutcomeKind;
  recordedAt: string;
  reason: string;
  sourceRecordIds: readonly string[];
  relatedHypothesisId: string | null;
  processor: string | null;
  retryable: boolean;
};

function requiredText(value: string, field: string): string {
  const clean = value.trim();
  if (!clean) throw new Error(`invalid_${field}`);
  return clean;
}

function optionalText(value: string | null, field: string): string | null {
  if (value === null) return null;
  return requiredText(value, field);
}

function distinctIds(values: readonly string[]): string[] {
  const clean = values.map((value) => requiredText(value, "source_record_id"));
  if (new Set(clean).size !== clean.length) throw new Error("duplicate_source_record_id");
  return clean;
}

export function validateResearchOutcomeReceipt(
  receipt: ResearchOutcomeReceipt,
): ResearchOutcomeReceipt {
  if (!researchOutcomeKinds.includes(receipt.kind)) {
    throw new Error("invalid_research_outcome_kind");
  }
  const recordedAt = requiredText(receipt.recordedAt, "recorded_at");
  const timestamp = Date.parse(recordedAt);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== recordedAt) {
    throw new Error("invalid_recorded_at");
  }

  const normalized: ResearchOutcomeReceipt = {
    ...receipt,
    receiptId: requiredText(receipt.receiptId, "receipt_id"),
    recordedAt,
    reason: requiredText(receipt.reason, "reason"),
    sourceRecordIds: distinctIds(receipt.sourceRecordIds),
    relatedHypothesisId: optionalText(receipt.relatedHypothesisId, "related_hypothesis_id"),
    processor: optionalText(receipt.processor, "processor"),
  };

  if (normalized.kind === "rejected_hypothesis") {
    if (!normalized.relatedHypothesisId) throw new Error("rejected_hypothesis_id_required");
    if (normalized.sourceRecordIds.length === 0) throw new Error("rejected_hypothesis_source_required");
    if (normalized.retryable) throw new Error("rejected_hypothesis_cannot_be_retryable");
  }
  if (normalized.kind === "missing_data") {
    if (normalized.processor) throw new Error("missing_data_processor_not_allowed");
  }
  if (normalized.kind === "extraction_failure") {
    if (!normalized.processor) throw new Error("extraction_failure_processor_required");
    if (normalized.sourceRecordIds.length !== 1) {
      throw new Error("extraction_failure_single_source_required");
    }
  }
  return normalized;
}

/**
 * Receipts are immutable audit facts. A later attempt gets a new receipt rather
 * than replacing the old failure/rejection. Persistence is deliberately outside
 * this pure contract until the disposable-DB/RLS gate is cleared.
 */
export function researchOutcomeReceiptKey(receipt: ResearchOutcomeReceipt): string {
  const valid = validateResearchOutcomeReceipt(receipt);
  return `${valid.kind}:${valid.receiptId}`;
}

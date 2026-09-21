export const evidenceStages = [
  "source_quote",
  "verified_observation",
  "interpretation",
  "hypothesis",
  "published_finding",
] as const;

export type EvidenceStage = (typeof evidenceStages)[number];

export type EvidenceStageRecord = {
  stage: EvidenceStage;
  sourceRecordId: string;
  originalBytesSha256: string;
  physicalPdfPage: number;
  independentOriginalPageReview: boolean;
  contextVerified: boolean;
  privacyReviewPassed: boolean;
  publicationReviewPassed: boolean;
  supportingRecordIds: readonly string[];
  counterevidenceRecordIds: readonly string[];
  rationale: string;
};

export type PromotionResult =
  | { ok: true; record: EvidenceStageRecord }
  | { ok: false; holdReasons: readonly string[] };

const rank: Record<EvidenceStage, number> = {
  source_quote: 0,
  verified_observation: 1,
  interpretation: 2,
  hypothesis: 3,
  published_finding: 4,
};

function text(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`invalid_${field}`);
  return trimmed;
}

function ids(values: readonly string[], field: string): string[] {
  const clean = values.map((value) => text(value, field));
  if (new Set(clean).size !== clean.length) throw new Error(`duplicate_${field}`);
  return clean;
}

export function validateEvidenceStageRecord(record: EvidenceStageRecord): EvidenceStageRecord {
  if (!evidenceStages.includes(record.stage)) throw new Error("invalid_evidence_stage");
  if (!Number.isSafeInteger(record.physicalPdfPage) || record.physicalPdfPage < 1) {
    throw new Error("invalid_physical_pdf_page");
  }
  const hash = text(record.originalBytesSha256, "original_bytes_sha256").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error("invalid_original_bytes_sha256");
  return {
    ...record,
    sourceRecordId: text(record.sourceRecordId, "source_record_id"),
    originalBytesSha256: hash,
    supportingRecordIds: ids(record.supportingRecordIds, "supporting_record_id"),
    counterevidenceRecordIds: ids(record.counterevidenceRecordIds, "counterevidence_record_id"),
    rationale: text(record.rationale, "rationale"),
  };
}

/**
 * Promotion is deliberately one stage at a time. This module does not decide
 * whether a claim is true and never turns multiple URLs into corroboration.
 * It only refuses unsafe status upgrades when required review evidence is absent.
 */
export function promoteEvidenceStage(
  input: EvidenceStageRecord,
  target: EvidenceStage,
): PromotionResult {
  const current = validateEvidenceStageRecord(input);
  if (!evidenceStages.includes(target)) throw new Error("invalid_evidence_stage");
  if (rank[target] !== rank[current.stage] + 1) {
    return { ok: false, holdReasons: ["promotion_must_be_single_stage"] };
  }

  const holdReasons: string[] = [];
  if (target === "verified_observation") {
    if (!current.independentOriginalPageReview) holdReasons.push("original_page_review_required");
    if (!current.contextVerified) holdReasons.push("context_verification_required");
  }
  if (target === "interpretation" || target === "hypothesis") {
    if (current.supportingRecordIds.length === 0) holdReasons.push("supporting_record_required");
  }
  if (target === "published_finding") {
    if (!current.independentOriginalPageReview) holdReasons.push("original_page_review_required");
    if (!current.contextVerified) holdReasons.push("context_verification_required");
    if (!current.privacyReviewPassed) holdReasons.push("privacy_review_required");
    if (!current.publicationReviewPassed) holdReasons.push("publication_review_required");
    if (current.supportingRecordIds.length === 0) holdReasons.push("supporting_record_required");
  }
  if (holdReasons.length) return { ok: false, holdReasons };
  return { ok: true, record: { ...current, stage: target } };
}

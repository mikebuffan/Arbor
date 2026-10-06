import { describe, expect, it } from "vitest";
import { promoteEvidenceStage, type EvidenceStageRecord } from "./evidenceStage";

const base = (overrides: Partial<EvidenceStageRecord> = {}): EvidenceStageRecord => ({
  stage: "source_quote",
  sourceRecordId: "source-1",
  originalBytesSha256: "a".repeat(64),
  physicalPdfPage: 7,
  independentOriginalPageReview: false,
  contextVerified: false,
  privacyReviewPassed: false,
  publicationReviewPassed: false,
  supportingRecordIds: [],
  counterevidenceRecordIds: [],
  rationale: "Exact source passage only; no inference.",
  ...overrides,
});

describe("evidence stage promotion", () => {
  it("holds source quote until original page and context are independently reviewed", () => {
    expect(promoteEvidenceStage(base(), "verified_observation")).toEqual({
      ok: false,
      holdReasons: ["original_page_review_required", "context_verification_required"],
    });
  });

  it("allows reviewed quote to become observation without changing provenance", () => {
    const input = base({ independentOriginalPageReview: true, contextVerified: true });
    const result = promoteEvidenceStage(input, "verified_observation");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.stage).toBe("verified_observation");
      expect(result.record.originalBytesSha256).toBe(input.originalBytesSha256);
      expect(result.record.physicalPdfPage).toBe(7);
    }
  });

  it("forbids skipping directly from quote to hypothesis or publication", () => {
    expect(promoteEvidenceStage(base(), "hypothesis")).toEqual({
      ok: false, holdReasons: ["promotion_must_be_single_stage"],
    });
    expect(promoteEvidenceStage(base(), "published_finding")).toEqual({
      ok: false, holdReasons: ["promotion_must_be_single_stage"],
    });
  });

  it("requires an explicit supporting record before interpretation", () => {
    const observation = base({
      stage: "verified_observation",
      independentOriginalPageReview: true,
      contextVerified: true,
    });
    expect(promoteEvidenceStage(observation, "interpretation")).toEqual({
      ok: false, holdReasons: ["supporting_record_required"],
    });
    expect(promoteEvidenceStage({ ...observation, supportingRecordIds: ["support-2"] }, "interpretation").ok)
      .toBe(true);
  });

  it("requires privacy and publication review before published finding", () => {
    const hypothesis = base({
      stage: "hypothesis",
      independentOriginalPageReview: true,
      contextVerified: true,
      supportingRecordIds: ["support-2"],
    });
    expect(promoteEvidenceStage(hypothesis, "published_finding")).toEqual({
      ok: false,
      holdReasons: ["privacy_review_required", "publication_review_required"],
    });
    expect(promoteEvidenceStage({
      ...hypothesis,
      privacyReviewPassed: true,
      publicationReviewPassed: true,
    }, "published_finding").ok).toBe(true);
  });

  it("preserves counterevidence instead of requiring a clean narrative", () => {
    const interpretation = base({
      stage: "interpretation",
      supportingRecordIds: ["support-2"],
      counterevidenceRecordIds: ["counter-9"],
    });
    const result = promoteEvidenceStage(interpretation, "hypothesis");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.record.counterevidenceRecordIds).toEqual(["counter-9"]);
  });

  it("rejects duplicate evidence references and invalid provenance", () => {
    expect(() => promoteEvidenceStage(base({
      supportingRecordIds: ["same", "same"],
    }), "verified_observation")).toThrow("duplicate_supporting_record_id");
    expect(() => promoteEvidenceStage(base({ physicalPdfPage: 0 }), "verified_observation"))
      .toThrow("invalid_physical_pdf_page");
    expect(() => promoteEvidenceStage(base({ originalBytesSha256: "invented" }), "verified_observation"))
      .toThrow("invalid_original_bytes_sha256");
  });
});

import { describe, expect, it } from "vitest";
import {
  draftEvidenceComparison, formatEvidenceComparisonDraft,
  validatePublicSourceLocator, type PublicSourceLocator,
} from "./evidenceComparison";

const source = (documentId: string, pdfPage: number): PublicSourceLocator => ({
  documentId,
  sourceUrl: "https://oig.justice.gov/sites/default/files/reports/23-085.pdf",
  pdfPage,
  printedPage: String(pdfPage - 7),
  excerpt: "The original PDF passage must be inspected before this is shared.",
});

function input() {
  return {
    id: "mcc-count-review",
    question: "How were the different SHU counts reconciled?",
    left: { statement: "The midnight slip records 73.", source: source("OIG-23-085", 72) },
    right: { statement: "The 3 a.m. slip records 72.", source: source("OIG-23-085", 73) },
    comparisonType: "already_documented" as const,
    explanation: "The OIG describes a transfer and an inaccurate midnight count.",
    limitations: "Published OIG finding, NOT an ARK discovery; inspect the original count slips.",
  };
}

describe("source-first comparison packet boundary", () => {
  it("preserves physical PDF page AND separate printed folio", () => {
    const draft = draftEvidenceComparison(input());
    const text = formatEvidenceComparisonDraft(draft);
    expect(text).toContain("PDF page 72 • printed page 65");
    expect(text).toContain("PDF page 73 • printed page 66");
    expect(text).toContain("https://oig.justice.gov/sites/default/files/reports/23-085.pdf");
  });
  it("never auto-certifies a contradiction or unlocks sharing", () => {
    const draft = draftEvidenceComparison(input());
    expect(draft.reviewStatus).toBe("needs_independent_verification");
    expect(draft.sharingStatus).toBe("hold_for_privacy_and_source_review");
    expect(formatEvidenceComparisonDraft(draft)).toContain("STATUS: HOLD");
  });
  it("rejects same-document same-page self-comparisons", () => {
    const draft = input();
    draft.right.source = source("OIG-23-085", 72);
    expect(() => draftEvidenceComparison(draft))
      .toThrow("research_comparison_same_source_page");
  });
  it("rejects empty quotations instead of creating phantom evidence", () => {
    expect(() => validatePublicSourceLocator({ ...source("EFTA00001000", 3), excerpt: "  " }))
      .toThrow("invalid_research_source_excerpt");
  });
  it("rejects zero, fractional and unknown PDF page numbers", () => {
    for (const pdfPage of [0, -1, 1.5, NaN]) {
      expect(() => validatePublicSourceLocator(source("EFTA00001000", pdfPage)))
        .toThrow("invalid_research_pdf_page");
    }
  });
  it("requires HTTPS and rejects credential-containing URLs", () => {
    for (const sourceUrl of [
      "http://example.org/a.pdf",
      "file:///var/private/data.pdf",
      "https://name:password@example.org/a.pdf",
      "not a url",
    ]) {
      expect(() => validatePublicSourceLocator({
        ...source("EFTA00001000", 3), sourceUrl,
      })).toThrow("invalid_research_source_url");
    }
  });
  it("does not make up source hashes and checks supplied hashes", () => {
    expect(() => validatePublicSourceLocator({
      ...source("EFTA00001000", 3), sha256: "made-up-hash",
    })).toThrow("invalid_research_source_sha256");
    expect(() => validatePublicSourceLocator({
      ...source("EFTA00001000", 3), sha256: "a".repeat(64),
    })).not.toThrow();
    expect(draftEvidenceComparison(input()).left.source.sha256).toBeUndefined();
  });
  it("requires explicit context and unanswered question", () => {
    expect(() => draftEvidenceComparison({
      ...input(), limitations: "",
    })).toThrow("invalid_research_comparison_limitations");
    expect(() => draftEvidenceComparison({
      ...input(), question: " ",
    })).toThrow("invalid_research_comparison_question");
  });
});

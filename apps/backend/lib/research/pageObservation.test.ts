import { describe, expect, it } from "vitest";
import {
  capturePdfOriginalBytes,
  createPdfPageEvidenceRecords,
  type PdfPageEvidenceRecord,
} from "./pdfPageProvenance";
import {
  draftEvidenceComparison,
  formatEvidenceComparisonDraft,
} from "./evidenceComparison";
import {
  matchesPageObservation,
  selectExactPageObservation,
} from "./pageObservation";

const source = "https://example.org/harmless-public-report.pdf";
async function records(): Promise<PdfPageEvidenceRecord[]> {
  // Deliberately synthetic PDF-signature bytes. This verifies the capture →
  // page-record → passage-selection contract, NOT a working PDF parser.
  const bytes = new TextEncoder().encode("%PDF-1.7\nsynthetic parser boundary");
  const original = await capturePdfOriginalBytes({
    sourceUri: source, documentId: "BENIGN-PUBLIC-FIXTURE",
    bytes, declaredPageCount: 3,
  });
  return createPdfPageEvidenceRecords(original, [
    {
      physicalPdfPage: 1, printedPage: "i",
      extractionStatus: "text_layer",
      extractedText: "Foreword: café. A repeated word: test; test.",
    },
    { physicalPdfPage: 2, extractionStatus: "image_only" },
    {
      physicalPdfPage: 3, printedPage: "1",
      extractionStatus: "text_layer",
      extractedText: "The second source-backed paragraph.",
    },
  ]);
}

describe("source-to-page-to-exact-observation bridge", () => {
  it("quotes exact original extracted span, carries physical page, folio and genuine byte hash", async () => {
    const [page] = await records();
    const begin = page.extractedText!.indexOf("café.");
    const candidate = selectExactPageObservation({
      page, startUtf16: begin, endUtf16: begin + "café.".length,
    });
    expect(candidate.observation.statement).toBe("café.");
    expect(candidate.observation.source.excerpt).toBe("café.");
    expect(candidate.span).toEqual({
      startUtf16: begin, endUtf16: begin + "café.".length,
    });
    expect(candidate.observation.source.pdfPage).toBe(1);
    expect(candidate.observation.source.printedPage).toBe("i");
    expect(candidate.observation.source.sha256).toBe(page.originalBytesSha256);
    expect(candidate.observation.source.sourceUrl).toBe(source);
    expect(candidate.reviewStatus)
      .toBe("needs_original_page_image_and_independent_verification");
    expect(candidate.sharingStatus).toBe("hold_for_privacy_and_source_review");
    expect(matchesPageObservation(candidate, page)).toBe(true);
  });

  it("disambiguates identical phrases with explicit positional spans", async () => {
    const [page] = await records();
    const text = page.extractedText!;
    const first = text.indexOf("test");
    const second = text.lastIndexOf("test");
    expect(first).not.toBe(second);
    const a = selectExactPageObservation({
      page, startUtf16: first, endUtf16: first + 4,
    });
    const b = selectExactPageObservation({
      page, startUtf16: second, endUtf16: second + 4,
    });
    expect(a.span).not.toEqual(b.span);
    expect(a.observation.source.excerpt).toBe(b.observation.source.excerpt);
    expect(matchesPageObservation(b, page)).toBe(true);
  });

  it("rejects scanned/failed pages rather than calling them empty evidence", async () => {
    const pages = await records();
    expect(() => selectExactPageObservation({
      page: pages[1], startUtf16: 0, endUtf16: 4,
    })).toThrow("research_page_not_extractable_for_quote");
    expect(() => selectExactPageObservation({
      page: { ...pages[0], extractionStatus: "extraction_failed",
        extractedText: null, errorCode: "broken" },
      startUtf16: 0, endUtf16: 4,
    })).toThrow("research_page_not_extractable_for_quote");
  });

  it("rejects missing, inverted, fractional, oversized and whitespace selections", async () => {
    const [page] = await records();
    for (const [startUtf16, endUtf16] of [
      [-1, 4], [4, 4], [6, 4], [0.5, 4], [0, 9999], [NaN, 3],
    ]) {
      expect(() => selectExactPageObservation({
        page, startUtf16, endUtf16,
      })).toThrow("invalid_research_page_quote_span");
    }
    const whitespace = page.extractedText!.indexOf(" ");
    expect(() => selectExactPageObservation({
      page, startUtf16: whitespace, endUtf16: whitespace + 1,
    })).toThrow("invalid_research_page_quote_span");
    expect(() => selectExactPageObservation({
      page: { ...page, extractedText: "a".repeat(200001) },
      startUtf16: 0, endUtf16: 4,
    })).toThrow("invalid_research_page_quote_span");
  });

  it("detects page, text, source and checksum substitution", async () => {
    const [page] = await records();
    const candidate = selectExactPageObservation({
      page, startUtf16: 0, endUtf16: 8,
    });
    expect(matchesPageObservation(candidate, page)).toBe(true);
    expect(matchesPageObservation(candidate, {
      ...page, extractedText: "Other text instead",
    })).toBe(false);
    expect(matchesPageObservation(candidate, {
      ...page, documentId: "DIFFERENT-DOCUMENT",
    })).toBe(false);
    expect(matchesPageObservation(candidate, {
      ...page, originalBytesSha256: "b".repeat(64),
    })).toBe(false);
    expect(matchesPageObservation(candidate, {
      ...page, locator: { physicalPdfPage: 3 },
    })).toBe(false);
  });

  it("feeds existing comparison drafts without automatic finding or sharing", async () => {
    const pages = await records();
    const left = selectExactPageObservation({
      page: pages[0], startUtf16: 0, endUtf16: 8,
    });
    const right = selectExactPageObservation({
      page: pages[2], startUtf16: 0, endUtf16: 10,
    });
    const draft = draftEvidenceComparison({
      id: "benign-comparison-candidate",
      question: "Do the passages need contextual review?",
      left: left.observation,
      right: right.observation,
      comparisonType: "missing_context",
      explanation: "Review the two different physical PDF pages.",
      limitations: "Synthetic text-layer fixture; no PDF parser, OCR or original image verification.",
    });
    expect(draft.reviewStatus).toBe("needs_independent_verification");
    expect(draft.sharingStatus).toBe("hold_for_privacy_and_source_review");
    expect(formatEvidenceComparisonDraft(draft)).toContain("STATUS: HOLD");
    expect(draft.left.source.sha256).toBe(pages[0].originalBytesSha256);
  });

  it("cannot turn unreviewed pages into a purported verified observation", async () => {
    const [page] = await records();
    expect(() => selectExactPageObservation({
      page: { ...page, reviewStatus: "approved" as typeof page.reviewStatus },
      startUtf16: 0, endUtf16: 4,
    })).toThrow("research_page_not_extractable_for_quote");
    expect(() => selectExactPageObservation({
      page: { ...page, originalBytesSha256: "invented" },
      startUtf16: 0, endUtf16: 4,
    })).toThrow("invalid_research_source_sha256");
  });
});

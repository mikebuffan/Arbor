import { describe, expect, it } from "vitest";
import { planPdfPageBatches, validateCompletePdfBatchPlan } from "./pdfBatchPlan";
import type { PdfOriginalCapture } from "./pdfPageProvenance";

const original = (pages: number): PdfOriginalCapture => ({
  sourceUri: "https://example.org/benign.pdf",
  documentId: "fixture",
  originalBytesSha256: "ab".repeat(32),
  originalByteLength: 4096,
  declaredPageCount: pages,
});

describe("PDF batch planning", () => {
  it("keeps a small document as one original-page range", () => {
    expect(planPdfPageBatches(original(4))).toEqual([{
      batchIndex: 0,
      batchPageLimit: 128,
      firstPhysicalPdfPage: 1,
      lastPhysicalPdfPage: 4,
      pageCount: 4,
      originalBytesSha256: "ab".repeat(32),
      originalDocumentPageCount: 4,
    }]);
  });

  it("plans >128 pages without renumbering the original document", () => {
    const batches = planPdfPageBatches(original(300));
    expect(batches.map(({ firstPhysicalPdfPage, lastPhysicalPdfPage }) =>
      [firstPhysicalPdfPage, lastPhysicalPdfPage])).toEqual([
      [1, 128], [129, 256], [257, 300],
    ]);
    expect(batches.every((b) => b.originalBytesSha256 === "ab".repeat(32))).toBe(true);
    expect(batches.every((b) => b.originalDocumentPageCount === 300)).toBe(true);
    expect(() => validateCompletePdfBatchPlan(original(300), batches)).not.toThrow();
  });

  it("supports a stricter bounded page limit", () => {
    const batches = planPdfPageBatches(original(5), 2);
    expect(batches.map((b) => b.pageCount)).toEqual([2, 2, 1]);
    expect(() => validateCompletePdfBatchPlan(original(5), batches)).not.toThrow();
  });

  it("refuses unsafe or nonsensical batch limits", () => {
    for (const limit of [0, 129, 1.5, Number.NaN]) {
      expect(() => planPdfPageBatches(original(5), limit))
        .toThrow("invalid_pdf_batch_page_limit");
    }
  });

  it("fails closed on a missing batch", () => {
    const batches = planPdfPageBatches(original(300)).slice(0, 2);
    expect(() => validateCompletePdfBatchPlan(original(300), batches))
      .toThrow("incomplete_pdf_batch_plan");
  });

  it("fails closed on gaps, overlap, renumbering, hash substitution or mixed limits", () => {
    const mutations = [
      { firstPhysicalPdfPage: 2 },
      { lastPhysicalPdfPage: 127, pageCount: 127 },
      { batchIndex: 7 },
      { originalBytesSha256: "cd".repeat(32) },
      { originalDocumentPageCount: 299 },
      { batchPageLimit: 64 },
    ];
    for (const patch of mutations) {
      const batches = planPdfPageBatches(original(300));
      batches[0] = { ...batches[0], ...patch };
      expect(() => validateCompletePdfBatchPlan(original(300), batches))
        .toThrow("invalid_pdf_batch_plan");
    }
  });
});

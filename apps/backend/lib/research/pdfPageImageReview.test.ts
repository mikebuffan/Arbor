import { describe, expect, it } from "vitest";
import {
  preparePdfPageImageReviewPacket,
  reportManualPdfPageImageObservation,
  type PdfPageImageRendering,
} from "./pdfPageImageReview";
import {
  createPdfPageEvidenceRecords,
  type PdfOriginalCapture,
} from "./pdfPageProvenance";

const original = (): PdfOriginalCapture => ({
  sourceUri: "https://example.org/public-report-page13.pdf",
  documentId: "public-report",
  originalBytesSha256: "ab".repeat(32),
  originalByteLength: 4096,
  declaredPageCount: 2,
});
const page = () => createPdfPageEvidenceRecords(original(), [
  {
    physicalPdfPage: 1,
    extractionStatus: "text_layer",
    extractedText: "Report excerpt.",
    printedPage: "13",
  },
  { physicalPdfPage: 2, extractionStatus: "image_only" },
])[0];
const rendering = (): PdfPageImageRendering => ({
  renderer: "poppler-pdftoppm",
  rendererVersion: "Poppler 25.05",
  imageFormat: "png",
  imageBytesSha256: "cd".repeat(32),
  imageByteLength: 4096,
  widthPx: 700,
  heightPx: 1000,
  dpi: 100,
});

describe("PDF page-image provenance (pure contract; not a renderer)", () => {
  it("keeps full-file and physical-page identity, never infers folio or source stamp", () => {
    const packet = preparePdfPageImageReviewPacket({
      original: original(), page: page(), rendering: rendering(),
    });
    expect(packet.originalBytesSha256).toBe("ab".repeat(32));
    expect(packet.originalDocumentPageCount).toBe(2);
    expect(packet.physicalPdfPage).toBe(1);
    expect(packet.rendering.imageBytesSha256).toBe("cd".repeat(32));
    // Neither the PDF filename nor an unreviewed parser folio is visual proof.
    expect(packet.printedFolioObservation).toBeNull();
    expect(packet.sourceStampObservation).toBeNull();
    expect(packet.imageReviewStatus).toBe("hold_for_manual_page_image_review");
    expect(packet.privacyReviewStatus).toBe("hold_for_privacy_review");
  });

  it("rejects image packets tied to a different source, hash or physical page", () => {
    const expectedOriginal = original();
    const expectedPage = page();
    const cases = [
      { ...expectedPage, sourceUri: "https://example.org/other.pdf" },
      { ...expectedPage, documentId: "other-document" },
      { ...expectedPage, originalBytesSha256: "ef".repeat(32) },
      { ...expectedPage, locator: { physicalPdfPage: 3 } },
      { ...expectedPage, reviewStatus: "approved" as typeof expectedPage.reviewStatus },
    ];
    for (const changedPage of cases) {
      expect(() => preparePdfPageImageReviewPacket({
        original: expectedOriginal, page: changedPage, rendering: rendering(),
      })).toThrow("pdf_page_image_source_mismatch");
    }
  });

  it("refuses non-PNG, missing renderer identity and oversized/invalid renders", () => {
    const cases: PdfPageImageRendering[] = [
      { ...rendering(), imageFormat: "jpg" as "png" },
      { ...rendering(), renderer: "unknown" as "poppler-pdftoppm" },
      { ...rendering(), rendererVersion: " " },
      { ...rendering(), imageBytesSha256: "not-a-hash" },
      { ...rendering(), imageByteLength: 21 * 1024 * 1024 },
      { ...rendering(), widthPx: 20000, heightPx: 10000 },
      { ...rendering(), dpi: 301 },
    ];
    for (const changedRendering of cases) {
      expect(() => preparePdfPageImageReviewPacket({
        original: original(), page: page(), rendering: changedRendering,
      })).toThrow();
    }
  });

  it("records human-reported observations without auto-verification or publication", () => {
    const packet = preparePdfPageImageReviewPacket({
      original: original(), page: page(), rendering: rendering(),
    });
    const observation = reportManualPdfPageImageObservation(packet, {
      reviewerId: "reviewer-1",
      reviewedAt: "2026-09-21T22:00:00Z",
      printedFolioObservation: "13",
      sourceStampObservation: "RECEIVED 2024-01-02",
    });
    expect(observation.originalBytesSha256).toBe(packet.originalBytesSha256);
    expect(observation.rendering.imageBytesSha256).toBe(packet.rendering.imageBytesSha256);
    expect(observation.printedFolioObservation).toBe("13");
    expect(observation.sourceStampObservation).toBe("RECEIVED 2024-01-02");
    expect(observation.imageReviewStatus)
      .toBe("human_reported_pending_independent_verification");
    expect(observation.privacyReviewStatus).toBe("hold_for_privacy_review");
    expect(packet.sourceStampObservation).toBeNull();
  });

  it("rejects fabricated/empty observations and malformed reviewer metadata", () => {
    const packet = preparePdfPageImageReviewPacket({
      original: original(), page: page(), rendering: rendering(),
    });
    const good = { reviewerId: "reviewer-1", reviewedAt: "2026-09-21T22:00:00Z" };
    expect(() => reportManualPdfPageImageObservation(packet, {
      ...good, sourceStampObservation: " ",
    })).toThrow("invalid_pdf_page_image_source_stamp");
    expect(() => reportManualPdfPageImageObservation(packet, {
      ...good, printedFolioObservation: "",
    })).toThrow("invalid_pdf_page_image_printed_folio");
    expect(() => reportManualPdfPageImageObservation(packet, {
      ...good, reviewerId: "",
    })).toThrow("invalid_pdf_page_image_reviewer_id");
    expect(() => reportManualPdfPageImageObservation(packet, {
      ...good, reviewedAt: "yesterday",
    })).toThrow("invalid_pdf_page_image_review_time");
  });
});

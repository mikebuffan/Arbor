import { describe, expect, it } from "vitest";
import {
  capturePdfPageImageReceipt,
  createPdfSourceStampCandidate,
  pageImageMatchesOriginal,
  MAX_RESEARCH_PAGE_IMAGE_BYTES,
} from "./pdfPageImageProvenance";
import {
  createPdfPageEvidenceRecords,
  type PdfOriginalCapture,
} from "./pdfPageProvenance";

const original: PdfOriginalCapture = {
  sourceUri: "https://example.org/harmless-public-fixture.pdf",
  documentId: "fixture-A",
  originalBytesSha256: "ab".repeat(32),
  originalByteLength: 4096,
  declaredPageCount: 2,
};

const pages = createPdfPageEvidenceRecords(original, [
  { physicalPdfPage: 1, extractionStatus: "text_layer", extractedText: "Page one" },
  { physicalPdfPage: 2, extractionStatus: "image_only" },
]);

// A signature-only fixture: this test does not claim PNG decoding or PDF rendering.
const pngBytes = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4,
]);

function capture(overrides: Record<string, unknown> = {}) {
  return capturePdfPageImageReceipt({
    original,
    page: pages[1],
    pngBytes,
    rendererVersion: "24.02.0",
    dpi: 150,
    renderedAtUtc: "2026-09-21T23:00:00.000Z",
    ...overrides,
  });
}

describe("held page-image and visual source-stamp provenance", () => {
  it("computes actual image-byte SHA, preserving source file hash and physical page", async () => {
    const image = await capture();
    expect(image.originalBytesSha256).toBe("ab".repeat(32));
    expect(image.physicalPdfPage).toBe(2);
    expect(image.originalDocumentPageCount).toBe(2);
    expect(image.imageBytesSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(image.imageBytesSha256).not.toBe(image.originalBytesSha256);
    expect(image.renderer).toBe("poppler-pdftoppm");
    expect(image.reviewStatus)
      .toBe("hold_for_original_page_image_and_privacy_review");
    expect(pageImageMatchesOriginal(image, original, pages[1])).toBe(true);
  });

  it("rejects a source, document, hash or physical-page substitution", async () => {
    const incorrect = [
      { ...original, sourceUri: "https://example.org/elsewhere.pdf" },
      { ...original, documentId: "fixture-B" },
      { ...original, originalBytesSha256: "cd".repeat(32) },
      { ...original, declaredPageCount: 1 },
    ];
    for (const alteredOriginal of incorrect) {
      await expect(capture({ original: alteredOriginal }))
        .rejects.toThrow("invalid_pdf_page_image_source_binding");
    }
    const image = await capture();
    expect(pageImageMatchesOriginal(image, original, pages[0])).toBe(false);
    expect(pageImageMatchesOriginal({ ...image, imageBytesSha256: "z".repeat(64) },
      original, pages[1])).toBe(false);
  });

  it("rejects a non-PNG signature, empty payload and excessive bytes", async () => {
    await expect(capture({ pngBytes: new Uint8Array([1, 2, 3]) }))
      .rejects.toThrow("invalid_pdf_page_image_byte_length");
    await expect(capture({ pngBytes: new Uint8Array(9) }))
      .rejects.toThrow("invalid_pdf_page_image_signature");
    await expect(capture({ pngBytes: new Uint8Array(MAX_RESEARCH_PAGE_IMAGE_BYTES + 1) }))
      .rejects.toThrow("invalid_pdf_page_image_byte_length");
  });

  it("rejects invented renderer metadata and timestamps", async () => {
    for (const overrides of [
      { rendererVersion: "" },
      { rendererVersion: "\n--shell" },
      { dpi: 0 },
      { dpi: 601 },
      { renderedAtUtc: "2026-09-21T23:00:00Z" },
      { renderedAtUtc: "2026-02-30T23:00:00.000Z" },
    ]) {
      await expect(capture(overrides))
        .rejects.toThrow("invalid_pdf_page_image_renderer_metadata");
    }
  });

  it("creates only a held explicit manual source-stamp candidate", async () => {
    const image = await capture();
    const candidate = createPdfSourceStampCandidate({
      original,
      page: pages[1],
      image,
      literalStampText: "EXHIBIT 0042",
      reviewerRef: "reviewer-test-1",
      observedAtUtc: "2026-09-21T23:01:00.000Z",
      reviewerConfirmedOriginalImage: true,
    });
    expect(candidate).toMatchObject({
      literalStampText: "EXHIBIT 0042",
      physicalPdfPage: 2,
      imageBytesSha256: image.imageBytesSha256,
      origin: "explicit_manual_page_image_attestation",
      reviewStatus: "hold_for_independent_original_review_and_privacy_review",
    });
    expect(candidate.literalStampText).not.toBe(original.documentId);
  });

  it("refuses stamp text inferred from a filename or a missing attestation", async () => {
    const image = await capture();
    const basis = {
      original,
      page: pages[1],
      image,
      reviewerRef: "reviewer-test-1",
      observedAtUtc: "2026-09-21T23:01:00.000Z",
      reviewerConfirmedOriginalImage: true as const,
    };
    for (const literalStampText of ["", " ".repeat(3), "x".repeat(201)]) {
      expect(() => createPdfSourceStampCandidate({ ...basis, literalStampText }))
        .toThrow("invalid_pdf_source_stamp_attestation");
    }
    expect(() => createPdfSourceStampCandidate({
      ...basis, literalStampText: "EXHIBIT 0042",
      reviewerConfirmedOriginalImage: false as unknown as true,
    })).toThrow("invalid_pdf_source_stamp_attestation");
    expect(() => createPdfSourceStampCandidate({
      ...basis, literalStampText: "EXHIBIT 0042",
      reviewerRef: "../unauthorized",
    })).toThrow("invalid_pdf_source_stamp_attestation");
  });

  it("refuses to attach a stamp to a different physical page or replaced image", async () => {
    const image = await capture();
    const basis = {
      original,
      page: pages[1],
      image,
      literalStampText: "EXHIBIT 0042",
      reviewerRef: "reviewer-test-1",
      observedAtUtc: "2026-09-21T23:01:00.000Z",
      reviewerConfirmedOriginalImage: true as const,
    };
    expect(() => createPdfSourceStampCandidate({
      ...basis, page: pages[0],
    })).toThrow("invalid_pdf_source_stamp_image_binding");
    expect(() => createPdfSourceStampCandidate({
      ...basis, image: { ...image, originalBytesSha256: "cd".repeat(32) },
    })).toThrow("invalid_pdf_source_stamp_image_binding");
  });
});

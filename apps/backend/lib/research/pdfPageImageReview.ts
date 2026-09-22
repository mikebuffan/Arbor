import {
  MAX_PDF_SOURCE_BYTES,
  type PdfOriginalCapture,
  type PdfPageEvidenceRecord,
} from "./pdfPageProvenance";

/**
 * Pure provenance + human-review handoff. This does NOT render an image,
 * hash PDF/image bytes, authenticate a reviewer, or clear evidence for
 * publication. An isolated executor must produce and hash the actual PNG.
 */
export type PdfPageImageRendering = {
  renderer: "poppler-pdftoppm";
  rendererVersion: string;
  imageFormat: "png";
  imageBytesSha256: string;
  imageByteLength: number;
  widthPx: number;
  heightPx: number;
  dpi: number;
};

export type PdfPageImageReviewPacket = {
  sourceUri: string;
  documentId: string;
  originalBytesSha256: string;
  originalDocumentPageCount: number;
  physicalPdfPage: number;
  rendering: PdfPageImageRendering;
  printedFolioObservation: null;
  sourceStampObservation: null;
  imageReviewStatus: "hold_for_manual_page_image_review";
  privacyReviewStatus: "hold_for_privacy_review";
};

export type ReportedPageImageObservation = Omit<
  PdfPageImageReviewPacket,
  "printedFolioObservation" | "sourceStampObservation" | "imageReviewStatus"
> & {
  printedFolioObservation: string | null;
  sourceStampObservation: string | null;
  reviewerId: string;
  reviewedAt: string;
  imageReviewStatus: "human_reported_pending_independent_verification";
};

function required(value: string, field: string, maxLength = 200): string {
  if (typeof value !== "string" || !value.trim() ||
      value.trim().length > maxLength) {
    throw new Error("invalid_pdf_page_image_" + field);
  }
  return value.trim();
}

function hash(value: string, field: string): string {
  if (typeof value !== "string" || !/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error("invalid_pdf_page_image_" + field);
  }
  return value.toLowerCase();
}

/**
 * Images remain unpublished and unreviewed. Never copy a printed folio
 * supplied by a text parser or guess a source stamp from a filename/URL.
 */
export function preparePdfPageImageReviewPacket(input: {
  original: PdfOriginalCapture;
  page: PdfPageEvidenceRecord;
  rendering: PdfPageImageRendering;
}): PdfPageImageReviewPacket {
  const { original, page, rendering } = input;
  const originalHash = hash(original.originalBytesSha256, "original_hash");
  let uri: URL;
  try { uri = new URL(original.sourceUri); }
  catch { throw new Error("invalid_pdf_page_image_source"); }
  if (uri.protocol !== "https:" || !uri.hostname ||
      uri.username || uri.password ||
      !original.documentId?.trim() ||
      !Number.isSafeInteger(original.originalByteLength) ||
      original.originalByteLength < 8 ||
      original.originalByteLength > MAX_PDF_SOURCE_BYTES ||
      !Number.isSafeInteger(original.declaredPageCount) ||
      original.declaredPageCount < 1 ||
      original.declaredPageCount > 10000) {
    throw new Error("invalid_pdf_page_image_original");
  }
  if (page.sourceUri !== original.sourceUri ||
      page.documentId !== original.documentId ||
      hash(page.originalBytesSha256, "page_hash") !== originalHash ||
      !Number.isSafeInteger(page.locator.physicalPdfPage) ||
      page.locator.physicalPdfPage < 1 ||
      page.locator.physicalPdfPage > original.declaredPageCount ||
      page.reviewStatus !== "hold_for_original_page_image_and_privacy_review") {
    throw new Error("pdf_page_image_source_mismatch");
  }
  if (rendering.renderer !== "poppler-pdftoppm" ||
      rendering.imageFormat !== "png") {
    throw new Error("invalid_pdf_page_image_renderer");
  }
  const rendererVersion = required(rendering.rendererVersion, "renderer_version", 100);
  const imageHash = hash(rendering.imageBytesSha256, "image_hash");
  if (!Number.isSafeInteger(rendering.imageByteLength) ||
      rendering.imageByteLength < 8 ||
      rendering.imageByteLength > 20 * 1024 * 1024 ||
      !Number.isSafeInteger(rendering.widthPx) ||
      !Number.isSafeInteger(rendering.heightPx) ||
      rendering.widthPx < 1 || rendering.heightPx < 1 ||
      rendering.widthPx > 20000 || rendering.heightPx > 20000 ||
      rendering.widthPx * rendering.heightPx > 80_000_000 ||
      !Number.isSafeInteger(rendering.dpi) ||
      rendering.dpi < 36 || rendering.dpi > 300) {
    throw new Error("invalid_pdf_page_image_budget");
  }
  return {
    sourceUri: original.sourceUri,
    documentId: original.documentId,
    originalBytesSha256: originalHash,
    originalDocumentPageCount: original.declaredPageCount,
    physicalPdfPage: page.locator.physicalPdfPage,
    rendering: {
      renderer: "poppler-pdftoppm",
      rendererVersion,
      imageFormat: "png",
      imageBytesSha256: imageHash,
      imageByteLength: rendering.imageByteLength,
      widthPx: rendering.widthPx,
      heightPx: rendering.heightPx,
      dpi: rendering.dpi,
    },
    printedFolioObservation: null,
    sourceStampObservation: null,
    imageReviewStatus: "hold_for_manual_page_image_review",
    privacyReviewStatus: "hold_for_privacy_review",
  };
}

/**
 * Records what a named reviewer reports seeing on a particular image.
 * This is NOT a verifier: identity, exact image bytes, fidelity to the
 * original PDF, source-stamp interpretation, and privacy need independent
 * checks. null means "not reported", NEVER "confirmed absent".
 */
export function reportManualPdfPageImageObservation(
  packet: PdfPageImageReviewPacket,
  input: {
    reviewerId: string;
    reviewedAt: string;
    printedFolioObservation?: string;
    sourceStampObservation?: string;
  },
): ReportedPageImageObservation {
  if (packet.imageReviewStatus !== "hold_for_manual_page_image_review" ||
      packet.privacyReviewStatus !== "hold_for_privacy_review" ||
      packet.printedFolioObservation !== null ||
      packet.sourceStampObservation !== null ||
      !/^[a-f0-9]{64}$/.test(packet.originalBytesSha256) ||
      !/^[a-f0-9]{64}$/.test(packet.rendering.imageBytesSha256)) {
    throw new Error("invalid_pdf_page_image_review_packet");
  }
  const reviewerId = required(input.reviewerId, "reviewer_id", 120);
  if (typeof input.reviewedAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(input.reviewedAt) ||
      !Number.isFinite(Date.parse(input.reviewedAt))) {
    throw new Error("invalid_pdf_page_image_review_time");
  }
  return {
    ...packet,
    printedFolioObservation: input.printedFolioObservation === undefined
      ? null : required(input.printedFolioObservation, "printed_folio", 120),
    sourceStampObservation: input.sourceStampObservation === undefined
      ? null : required(input.sourceStampObservation, "source_stamp", 200),
    reviewerId,
    reviewedAt: input.reviewedAt,
    imageReviewStatus: "human_reported_pending_independent_verification",
  };
}

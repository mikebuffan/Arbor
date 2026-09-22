/**
 * Pure, local page-image evidence MANIFEST for future sandbox rendering.
 *
 * This module does not render PDFs, inspect PNG pixels, fetch sources, perform
 * OCR, infer printed folios or authorize publication. A PNG signature and
 * computed byte hash cannot prove that the image came from the claimed PDF:
 * the upstream pinned, isolated renderer and human visual review remain gates.
 */
import type {
  PdfOriginalCapture,
  PdfPageEvidenceRecord,
} from "./pdfPageProvenance";

export const MAX_RESEARCH_PAGE_IMAGE_BYTES = 12 * 1024 * 1024;

export type PdfPageImageReceipt = {
  sourceUri: string;
  documentId: string;
  originalBytesSha256: string;
  originalDocumentPageCount: number;
  physicalPdfPage: number;
  imageFormat: "png";
  imageBytesSha256: string;
  imageByteLength: number;
  renderer: "poppler-pdftoppm";
  rendererVersion: string;
  dpi: number;
  renderedAtUtc: string;
  reviewStatus: "hold_for_original_page_image_and_privacy_review";
};

export type PdfSourceStampCandidate = {
  sourceUri: string;
  documentId: string;
  originalBytesSha256: string;
  physicalPdfPage: number;
  imageBytesSha256: string;
  literalStampText: string;
  reviewerRef: string;
  observedAtUtc: string;
  origin: "explicit_manual_page_image_attestation";
  reviewStatus: "hold_for_independent_original_review_and_privacy_review";
};

function canonicalUtc(value: string): boolean {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }
  const time = new Date(value);
  return Number.isFinite(time.getTime()) && time.toISOString() === value;
}

function originalPageMatches(
  original: PdfOriginalCapture,
  page: PdfPageEvidenceRecord,
): boolean {
  return original.sourceUri === page.sourceUri &&
    original.documentId === page.documentId &&
    /^[a-fA-F0-9]{64}$/.test(original.originalBytesSha256) &&
    original.originalBytesSha256.toLowerCase() ===
      page.originalBytesSha256.toLowerCase() &&
    Number.isSafeInteger(original.declaredPageCount) &&
    original.declaredPageCount >= 1 &&
    original.declaredPageCount <= 10000 &&
    Number.isSafeInteger(page.locator.physicalPdfPage) &&
    page.locator.physicalPdfPage >= 1 &&
    page.locator.physicalPdfPage <= original.declaredPageCount &&
    page.reviewStatus === "hold_for_original_page_image_and_privacy_review";
}

/**
 * Receives bytes from a future separately sandboxed renderer. Computes the
 * image-byte hash locally instead of accepting a guessed checksum. Does NOT
 * authenticate the renderer, decode pixels or clear the source for publication.
 */
export async function capturePdfPageImageReceipt(input: {
  original: PdfOriginalCapture;
  page: PdfPageEvidenceRecord;
  pngBytes: Uint8Array;
  rendererVersion: string;
  dpi: number;
  renderedAtUtc: string;
}): Promise<PdfPageImageReceipt> {
  const { original, page, pngBytes, rendererVersion, dpi, renderedAtUtc } = input;
  if (!originalPageMatches(original, page)) {
    throw new Error("invalid_pdf_page_image_source_binding");
  }
  if (!(pngBytes instanceof Uint8Array) ||
      pngBytes.byteLength <= 8 ||
      pngBytes.byteLength > MAX_RESEARCH_PAGE_IMAGE_BYTES) {
    throw new Error("invalid_pdf_page_image_byte_length");
  }
  const pngMagic = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!pngMagic.every((byte, i) => pngBytes[i] === byte)) {
    throw new Error("invalid_pdf_page_image_signature");
  }
  if (typeof rendererVersion !== "string" ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._+ -]{0,79}$/.test(rendererVersion) ||
      !Number.isSafeInteger(dpi) || dpi < 72 || dpi > 600 ||
      !canonicalUtc(renderedAtUtc)) {
    throw new Error("invalid_pdf_page_image_renderer_metadata");
  }

  const copiedBytes = new Uint8Array(pngBytes.byteLength);
  copiedBytes.set(pngBytes);
  const digest = await crypto.subtle.digest("SHA-256", copiedBytes.buffer);
  const imageBytesSha256 = Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0")).join("");

  return {
    sourceUri: original.sourceUri,
    documentId: original.documentId,
    originalBytesSha256: original.originalBytesSha256.toLowerCase(),
    originalDocumentPageCount: original.declaredPageCount,
    physicalPdfPage: page.locator.physicalPdfPage,
    imageFormat: "png",
    imageBytesSha256,
    imageByteLength: pngBytes.byteLength,
    renderer: "poppler-pdftoppm",
    rendererVersion,
    dpi,
    renderedAtUtc,
    reviewStatus: "hold_for_original_page_image_and_privacy_review",
  };
}

export function pageImageMatchesOriginal(
  image: PdfPageImageReceipt,
  original: PdfOriginalCapture,
  page: PdfPageEvidenceRecord,
): boolean {
  return originalPageMatches(original, page) &&
    image.sourceUri === original.sourceUri &&
    image.documentId === original.documentId &&
    image.originalBytesSha256 === original.originalBytesSha256.toLowerCase() &&
    image.originalDocumentPageCount === original.declaredPageCount &&
    image.physicalPdfPage === page.locator.physicalPdfPage &&
    image.imageFormat === "png" &&
    /^[a-f0-9]{64}$/.test(image.imageBytesSha256) &&
    image.imageByteLength > 8 &&
    image.imageByteLength <= MAX_RESEARCH_PAGE_IMAGE_BYTES &&
    image.renderer === "poppler-pdftoppm" &&
    image.reviewStatus === "hold_for_original_page_image_and_privacy_review";
}

/**
 * Capture an explicit human-supplied candidate stamp/folio transcription.
 * No filename, URL, PDF metadata, OCR output or page index can be promoted
 * into stamp text by this function. It remains HOLD until independent review.
 */
export function createPdfSourceStampCandidate(input: {
  image: PdfPageImageReceipt;
  original: PdfOriginalCapture;
  page: PdfPageEvidenceRecord;
  literalStampText: string;
  reviewerRef: string;
  observedAtUtc: string;
  reviewerConfirmedOriginalImage: true;
}): PdfSourceStampCandidate {
  const {
    image, original, page, literalStampText,
    reviewerRef, observedAtUtc, reviewerConfirmedOriginalImage,
  } = input;
  if (!pageImageMatchesOriginal(image, original, page)) {
    throw new Error("invalid_pdf_source_stamp_image_binding");
  }
  if (reviewerConfirmedOriginalImage !== true ||
      typeof literalStampText !== "string" ||
      !literalStampText.trim() ||
      literalStampText.length > 200 ||
      typeof reviewerRef !== "string" ||
      !/^[a-zA-Z0-9:_-]{2,100}$/.test(reviewerRef) ||
      !canonicalUtc(observedAtUtc)) {
    throw new Error("invalid_pdf_source_stamp_attestation");
  }
  return {
    sourceUri: image.sourceUri,
    documentId: image.documentId,
    originalBytesSha256: image.originalBytesSha256,
    physicalPdfPage: image.physicalPdfPage,
    imageBytesSha256: image.imageBytesSha256,
    literalStampText,
    reviewerRef,
    observedAtUtc,
    origin: "explicit_manual_page_image_attestation",
    reviewStatus: "hold_for_independent_original_review_and_privacy_review",
  };
}

import {
  validatePublicSourceLocator,
  type DocumentObservation,
} from "./evidenceComparison";
import type { PdfPageEvidenceRecord } from "./pdfPageProvenance";

/**
 * An EXACT text-layer selection with source and byte-hash provenance.
 *
 * The caller must supply page records produced by createPdfPageEvidenceRecords
 * from an upstream original-byte capture. This function does NOT itself
 * validate the original PDF bytes, parse PDFs, recognize image-only pages,
 * perform OCR, determine whether an extracted page is complete, independently
 * verify a quotation against the original page image, or clear private data.
 *
 * Offsets count UTF-16 code units in page.extractedText (JS string.slice),
 * not PDF bytes, glyphs, OCR coordinates, or original visual-page positions.
 */
export type PageObservationCandidate = {
  observation: DocumentObservation;
  span: {
    startUtf16: number;
    endUtf16: number;
  };
  originalBytesSha256: string;
  extractedPageReviewStatus: "hold_for_original_page_image_and_privacy_review";
  reviewStatus: "needs_original_page_image_and_independent_verification";
  sharingStatus: "hold_for_privacy_and_source_review";
};

const MAX_QUOTE_UTF16 = 2000;
const MAX_PAGE_UTF16 = 200000;

/**
 * Never construct a quote by guessing a search hit or editing whitespace.
 * Return the exact substring of one source-backed, physical PDF page.
 */
export function selectExactPageObservation(input: {
  page: PdfPageEvidenceRecord;
  startUtf16: number;
  endUtf16: number;
}): PageObservationCandidate {
  const { page, startUtf16, endUtf16 } = input;
  if (page.extractionStatus !== "text_layer" ||
      page.extractedText === null || typeof page.extractedText !== "string" ||
      page.errorCode !== null ||
      page.reviewStatus !== "hold_for_original_page_image_and_privacy_review") {
    throw new Error("research_page_not_extractable_for_quote");
  }
  const text = page.extractedText;
  if (!text.trim() || text.length > MAX_PAGE_UTF16 ||
      !Number.isSafeInteger(startUtf16) ||
      !Number.isSafeInteger(endUtf16) ||
      startUtf16 < 0 || endUtf16 <= startUtf16 ||
      endUtf16 > text.length ||
      endUtf16 - startUtf16 > MAX_QUOTE_UTF16) {
    throw new Error("invalid_research_page_quote_span");
  }

  const quote = text.slice(startUtf16, endUtf16);
  if (!quote.trim()) throw new Error("invalid_research_page_quote_span");

  // A comparison packet accepts only an exact source quote here; an
  // interpretive statement must be a separate, explicitly reviewed claim.
  const source: DocumentObservation["source"] = {
    documentId: page.documentId,
    sourceUrl: page.sourceUri,
    pdfPage: page.locator.physicalPdfPage,
    ...(page.locator.printedPage !== undefined
      ? { printedPage: page.locator.printedPage } : {}),
    excerpt: quote,
    sha256: page.originalBytesSha256,
  };
  validatePublicSourceLocator(source);
  return {
    observation: { statement: quote, source },
    span: { startUtf16, endUtf16 },
    originalBytesSha256: page.originalBytesSha256.toLowerCase(),
    extractedPageReviewStatus: page.reviewStatus,
    reviewStatus: "needs_original_page_image_and_independent_verification",
    sharingStatus: "hold_for_privacy_and_source_review",
  };
}

/**
 * Fail closed if an observation is later shown with a different extracted
 * text or different original file hash. This does not authenticate the PDF;
 * it only detects an internal record/quote substitution.
 */
export function matchesPageObservation(
  candidate: PageObservationCandidate,
  page: PdfPageEvidenceRecord,
): boolean {
  try {
    const selection = selectExactPageObservation({
      page,
      startUtf16: candidate.span.startUtf16,
      endUtf16: candidate.span.endUtf16,
    });
    return selection.observation.source.documentId ===
        candidate.observation.source.documentId &&
      selection.observation.source.sourceUrl ===
        candidate.observation.source.sourceUrl &&
      selection.observation.source.pdfPage ===
        candidate.observation.source.pdfPage &&
      selection.observation.source.printedPage ===
        candidate.observation.source.printedPage &&
      selection.observation.source.excerpt ===
        candidate.observation.source.excerpt &&
      selection.observation.statement === candidate.observation.statement &&
      selection.originalBytesSha256 ===
        candidate.originalBytesSha256.toLowerCase() &&
      selection.originalBytesSha256 ===
        candidate.observation.source.sha256?.toLowerCase() &&
      candidate.reviewStatus ===
        "needs_original_page_image_and_independent_verification" &&
      candidate.sharingStatus === "hold_for_privacy_and_source_review";
  } catch {
    return false;
  }
}

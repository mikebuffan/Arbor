/**
 * Page-level evidence boundary for a future PDF parser.
 *
 * This does NOT parse PDFs, perform OCR, fetch documents or verify that
 * a supplied hash belongs to the bytes. Those must happen upstream.
 * It refuses a partial page inventory instead of silently treating
 * pages without extractable text as empty/no-evidence pages.
 */
export type PdfOriginalCapture = {
  sourceUri: string;
  documentId: string;
  originalBytesSha256: string;
  originalByteLength: number;
  declaredPageCount: number;
};

export type PdfExtractionStatus = "text_layer" | "image_only" | "extraction_failed";

export type PdfExtractedPage = {
  physicalPdfPage: number;
  extractionStatus: PdfExtractionStatus;
  extractedText?: string;
  printedPage?: string;
  errorCode?: string;
};

export type PdfPageEvidenceRecord = {
  sourceUri: string;
  documentId: string;
  originalBytesSha256: string;
  locator: { physicalPdfPage: number; printedPage?: string };
  extractionStatus: PdfExtractionStatus;
  extractedText: string | null;
  reviewStatus: "hold_for_original_page_image_and_privacy_review";
  errorCode: string | null;
};

function required(value: string, field: string): void {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("invalid_pdf_" + field);
  }
}

/**
 * All physical pages must be represented, including scanned and failed pages.
 * Printed folios are optional metadata and never replace the PDF page index.
 */
export function createPdfPageEvidenceRecords(
  original: PdfOriginalCapture,
  parsedPages: PdfExtractedPage[],
): PdfPageEvidenceRecord[] {
  required(original.sourceUri, "source_uri");
  required(original.documentId, "document_id");
  let uri: URL;
  try { uri = new URL(original.sourceUri); }
  catch { throw new Error("invalid_pdf_source_uri"); }
  if (uri.protocol !== "https:" || !uri.hostname || uri.username || uri.password) {
    throw new Error("invalid_pdf_source_uri");
  }
  if (!/^[a-fA-F0-9]{64}$/.test(original.originalBytesSha256)) {
    throw new Error("invalid_pdf_original_bytes_hash");
  }
  if (!Number.isSafeInteger(original.originalByteLength) ||
      original.originalByteLength < 5) {
    throw new Error("invalid_pdf_original_byte_length");
  }
  if (!Number.isSafeInteger(original.declaredPageCount) ||
      original.declaredPageCount < 1 || original.declaredPageCount > 10000) {
    throw new Error("invalid_pdf_page_count");
  }
  if (!Array.isArray(parsedPages) ||
      parsedPages.length !== original.declaredPageCount) {
    throw new Error("incomplete_pdf_page_inventory");
  }

  const seen = new Set<number>();
  const records: PdfPageEvidenceRecord[] = [];
  for (const page of parsedPages) {
    const p = page.physicalPdfPage;
    if (!Number.isSafeInteger(p) || p < 1 ||
        p > original.declaredPageCount || seen.has(p)) {
      throw new Error("invalid_pdf_page_sequence");
    }
    seen.add(p);
    if (page.printedPage !== undefined) required(page.printedPage, "printed_page");
    if (!(["text_layer", "image_only", "extraction_failed"] as string[])
      .includes(page.extractionStatus)) {
      throw new Error("invalid_pdf_extraction_status");
    }
    const text = page.extractedText?.trim() ?? "";
    if (page.extractionStatus === "text_layer") {
      if (!text || text.length > 200000 || page.errorCode !== undefined) {
        throw new Error("invalid_pdf_text_layer");
      }
    } else if (text || (page.extractionStatus === "extraction_failed" &&
                        !page.errorCode?.trim())) {
      throw new Error("invalid_pdf_non_text_page");
    }
    records.push({
      sourceUri: original.sourceUri,
      documentId: original.documentId,
      originalBytesSha256: original.originalBytesSha256.toLowerCase(),
      locator: {
        physicalPdfPage: p,
        ...(page.printedPage !== undefined
          ? { printedPage: page.printedPage.trim() } : {}),
      },
      extractionStatus: page.extractionStatus,
      extractedText: page.extractionStatus === "text_layer" ? text : null,
      reviewStatus: "hold_for_original_page_image_and_privacy_review",
      errorCode: page.extractionStatus === "extraction_failed"
        ? page.errorCode!.trim() : null,
    });
  }
  return records.sort((a, b) =>
    a.locator.physicalPdfPage - b.locator.physicalPdfPage);
}

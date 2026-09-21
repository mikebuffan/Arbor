import type { PdfOriginalCapture } from "./pdfPageProvenance";

export const MAX_PDF_PAGES_PER_BATCH = 128;

export type PdfPageBatch = {
  batchIndex: number;
  firstPhysicalPdfPage: number;
  lastPhysicalPdfPage: number;
  pageCount: number;
  originalBytesSha256: string;
  originalDocumentPageCount: number;
};

/**
 * Pure planning only: this does NOT split bytes or authorize parsing. Every
 * batch remains a view over the one captured original document and therefore
 * retains its full-file hash and original physical page numbers.
 */
export function planPdfPageBatches(
  original: PdfOriginalCapture,
  maxPagesPerBatch = MAX_PDF_PAGES_PER_BATCH,
): PdfPageBatch[] {
  if (!Number.isSafeInteger(maxPagesPerBatch) ||
      maxPagesPerBatch < 1 || maxPagesPerBatch > MAX_PDF_PAGES_PER_BATCH) {
    throw new Error("invalid_pdf_batch_page_limit");
  }
  if (!Number.isSafeInteger(original.declaredPageCount) ||
      original.declaredPageCount < 1 || original.declaredPageCount > 10000) {
    throw new Error("invalid_pdf_batch_document_page_count");
  }
  if (!/^[a-fA-F0-9]{64}$/.test(original.originalBytesSha256)) {
    throw new Error("invalid_pdf_batch_original_hash");
  }

  const batches: PdfPageBatch[] = [];
  for (let first = 1, batchIndex = 0;
       first <= original.declaredPageCount;
       first += maxPagesPerBatch, batchIndex += 1) {
    const last = Math.min(first + maxPagesPerBatch - 1, original.declaredPageCount);
    batches.push({
      batchIndex,
      firstPhysicalPdfPage: first,
      lastPhysicalPdfPage: last,
      pageCount: last - first + 1,
      originalBytesSha256: original.originalBytesSha256.toLowerCase(),
      originalDocumentPageCount: original.declaredPageCount,
    });
  }
  return batches;
}

export function validateCompletePdfBatchPlan(
  original: PdfOriginalCapture,
  batches: readonly PdfPageBatch[],
): void {
  const expected = planPdfPageBatches(original,
    batches.length ? Math.max(...batches.map((batch) => batch.pageCount)) : 1);
  if (batches.length !== expected.length) throw new Error("incomplete_pdf_batch_plan");
  for (let index = 0; index < batches.length; index += 1) {
    const actual = batches[index];
    const wanted = expected[index];
    if (actual.batchIndex !== wanted.batchIndex ||
        actual.firstPhysicalPdfPage !== wanted.firstPhysicalPdfPage ||
        actual.lastPhysicalPdfPage !== wanted.lastPhysicalPdfPage ||
        actual.pageCount !== wanted.pageCount ||
        actual.originalBytesSha256.toLowerCase() !== wanted.originalBytesSha256 ||
        actual.originalDocumentPageCount !== wanted.originalDocumentPageCount) {
      throw new Error("invalid_pdf_batch_plan");
    }
  }
}

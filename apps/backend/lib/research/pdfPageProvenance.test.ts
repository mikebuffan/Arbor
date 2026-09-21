import { describe, expect, it } from "vitest";
import {
  createPdfPageEvidenceRecords,
  type PdfOriginalCapture,
  type PdfExtractedPage,
} from "./pdfPageProvenance";

const original = (): PdfOriginalCapture => ({
  sourceUri: "https://example.org/public-report.pdf",
  documentId: "PUBLIC-REPORT-1",
  originalBytesSha256: "a".repeat(64),
  originalByteLength: 1024,
  declaredPageCount: 3,
});
const pages = (): PdfExtractedPage[] => [
  { physicalPdfPage: 1, extractionStatus: "text_layer", extractedText: "Public cover." },
  { physicalPdfPage: 2, extractionStatus: "image_only", printedPage: "i" },
  { physicalPdfPage: 3, extractionStatus: "extraction_failed", errorCode: "parser_error" },
];

describe("PDF page provenance intake boundary (not a PDF parser)", () => {
  it("keeps physical pages separate from folios and never calls scanned pages empty", () => {
    const records = createPdfPageEvidenceRecords(original(), [...pages()].reverse());
    expect(records.map(r => r.locator.physicalPdfPage)).toEqual([1, 2, 3]);
    expect(records[1].locator.printedPage).toBe("i");
    expect(records[1].extractionStatus).toBe("image_only");
    expect(records[1].extractedText).toBeNull();
    expect(records[2].extractionStatus).toBe("extraction_failed");
    expect(records[2].errorCode).toBe("parser_error");
    for (const record of records) {
      expect(record.originalBytesSha256).toBe("a".repeat(64));
      expect(record.reviewStatus)
        .toBe("hold_for_original_page_image_and_privacy_review");
    }
  });
  it("rejects missing or duplicate page entries instead of implying absence", () => {
    expect(() => createPdfPageEvidenceRecords(original(), pages().slice(0, 2)))
      .toThrow("incomplete_pdf_page_inventory");
    expect(() => createPdfPageEvidenceRecords(original(),
      [pages()[0], pages()[0], pages()[2]]))
      .toThrow("invalid_pdf_page_sequence");
    expect(() => createPdfPageEvidenceRecords(original(),
      [{...pages()[0], physicalPdfPage: 4}, pages()[1], pages()[2]]))
      .toThrow("invalid_pdf_page_sequence");
  });
  it("rejects invented text for a scanned or failed page", () => {
    expect(() => createPdfPageEvidenceRecords(original(),
      [pages()[0], {...pages()[1], extractedText: "guessed words"}, pages()[2]]))
      .toThrow("invalid_pdf_non_text_page");
    expect(() => createPdfPageEvidenceRecords(original(),
      [{...pages()[0], extractedText: " "}, pages()[1], pages()[2]]))
      .toThrow("invalid_pdf_text_layer");
    expect(() => createPdfPageEvidenceRecords(original(),
      [pages()[0], pages()[1], {...pages()[2], errorCode: ""}]))
      .toThrow("invalid_pdf_non_text_page");
  });
  it("rejects unknown extraction status", () => {
    expect(() => createPdfPageEvidenceRecords(original(), [
      {...pages()[0], extractionStatus: "ocr_magic" as "text_layer"},
      pages()[1], pages()[2],
    ])).toThrow("invalid_pdf_extraction_status");
  });
  it("requires explicit source identity and original bytes hash", () => {
    expect(() => createPdfPageEvidenceRecords(
      {...original(), originalBytesSha256: "not-a-hash"}, pages()))
      .toThrow("invalid_pdf_original_bytes_hash");
    expect(() => createPdfPageEvidenceRecords(
      {...original(), documentId: ""}, pages()))
      .toThrow("invalid_pdf_document_id");
    expect(() => createPdfPageEvidenceRecords(
      {...original(), originalByteLength: 0}, pages()))
      .toThrow("invalid_pdf_original_byte_length");
    expect(() => createPdfPageEvidenceRecords(
      {...original(), declaredPageCount: 0}, pages()))
      .toThrow("invalid_pdf_page_count");
  });
  it("refuses non-HTTPS or credential-bearing source links", () => {
    for (const sourceUri of ["file:///private.pdf",
      "http://example.org/a.pdf", "https://user:pass@example.org/a.pdf"]) {
      expect(() => createPdfPageEvidenceRecords(
        {...original(), sourceUri}, pages()))
        .toThrow("invalid_pdf_source_uri");
    }
  });
});

import { describe, expect, it } from "vitest";
import { findSourceAnchoredTransferDateConflicts } from "./sourceAnchoredDateConflict";
import type { PdfPageEvidenceRecord } from "./pdfPageProvenance";

const source = "https://www.govinfo.gov/content/pkg/USCOURTS-flsb-9_03-ap-03228/pdf/USCOURTS-flsb-9_03-ap-03228-0.pdf";
function page(physicalPdfPage: number, extractedText: string): PdfPageEvidenceRecord {
  return {
    sourceUri: source, documentId: "Adv-03-3228-Doc-115",
    originalBytesSha256: "a".repeat(64),
    locator: { physicalPdfPage }, extractionStatus: "text_layer",
    extractedText, reviewStatus: "hold_for_original_page_image_and_privacy_review",
    errorCode: null,
  };
}

describe("source-anchored transfer-date acceptance", () => {
  it("flags the two dates on different pages, cites both and keeps one lineage on hold", () => {
    const candidates = findSourceAnchoredTransferDateConflicts({
      eventKey: "H80", subject: "North County Road",
      pages: [
        page(3, "The court described the October 10, 1999 transfers of the North County Road property."),
        page(4, "The quoted finding lists the North County Road transfer of July 30, 1999, the artwork transfer of October 10, 1999."),
      ],
    });
    expect(candidates).toHaveLength(1);
    expect(new Set(candidates[0].dates)).toEqual(new Set(["1999-10-10", "1999-07-30"]));
    expect(candidates[0].comparison.left.source.pdfPage).toBe(3);
    expect(candidates[0].comparison.right.source.pdfPage).toBe(4);
    expect(candidates[0].sourceFamilyCount).toBe(1);
    expect(candidates[0].comparison.reviewStatus).toBe("needs_independent_verification");
    expect(candidates[0].status).toBe("hold_for_original_page_and_instrument_review");
  });

  it("does not turn an unrelated October date or repeated same date into a conflict", () => {
    const candidates = findSourceAnchoredTransferDateConflicts({
      eventKey: "control", subject: "North County Road",
      pages: [
        page(1, "North County Road transfer of July 30, 1999. The artwork transfer of October 10, 1999."),
        page(2, "A later filing again describes the North County Road transfer of July 30, 1999."),
      ],
    });
    expect(candidates).toHaveLength(0);
  });
});

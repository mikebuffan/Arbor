import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { extractLocalPublicPdf } from "./localPdfParser";
import { selectExactPageObservation } from "./pageObservation";
import { draftEvidenceComparison } from "./evidenceComparison";

/** Real, standards-conformant synthetic PDF; Poppler parses its xref and pages. */
function harmlessPdf(): Uint8Array {
  const stream = (s: string) =>
    "<< /Length " + Buffer.byteLength(s, "ascii") +
    " >>\nstream\n" + s + "\nendstream";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R 11 0 R] /Count 4 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 6 0 R >> >> /Contents 7 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /XObject << /Im1 10 0 R >> >> /Contents 8 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 6 0 R >> >> /Contents 9 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    stream("BT /F1 12 Tf 40 450 Td (PUBLIC TEST SOURCE PAGE ONE) Tj 0 -24 Td (The library opened at nine oclock.) Tj ET"),
    stream("q 120 0 0 120 50 300 cm /Im1 Do Q"),
    stream("BT /F1 12 Tf 40 450 Td (PUBLIC TEST SOURCE PAGE THREE) Tj 0 -24 Td (A second record was preserved for review.) Tj ET"),
    "<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length 7 >>\nstream\n26AAFF>\nendstream",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << >> /Contents 12 0 R >>",
    stream("q Q"),
  ];
  let data = "%PDF-1.4\n%synthetic-harmless-fixture\n";
  const offsets: number[] = [];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(data, "ascii"));
    data += String(index + 1) + " 0 obj\n" + object + "\nendobj\n";
  }
  const xref = Buffer.byteLength(data, "ascii");
  data += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (const offset of offsets) data += String(offset).padStart(10, "0") + " 00000 n \n";
  data += "trailer\n<< /Size " + (objects.length + 1) +
    " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
  return Buffer.from(data, "ascii");
}
const input = () => ({
  sourceUri: "https://example.org/harmless-fixture.pdf",
  documentId: "BENIGN-PDF-PARSER-TEST",
  bytes: harmlessPdf(),
});

describe("actual local Poppler PDF parsing; no live case data", () => {
  it("preserves four physical pages and refuses to conflate blank and scanned", async () => {
    const result = await extractLocalPublicPdf(input());
    expect(result.original.declaredPageCount).toBe(4);
    expect(result.original.originalBytesSha256).toBe(
      createHash("sha256").update(input().bytes).digest("hex"));
    expect(result.pages.map(x => x.locator.physicalPdfPage)).toEqual([1, 2, 3, 4]);
    expect(result.pages.map(x => x.extractionStatus)).toEqual([
      "text_layer", "image_only", "text_layer", "extraction_failed",
    ]);
    expect(result.pages[0].extractedText).toContain("The library opened");
    expect(result.pages[1].extractedText).toBeNull();
    expect(result.pages[2].extractedText).toContain("A second record");
    expect(result.pages[3].errorCode).toBe("no_extractable_text_or_blank_page");
    expect(result.pages.every(x => x.reviewStatus ===
      "hold_for_original_page_image_and_privacy_review")).toBe(true);
  });
  it("real PDF → exact selected passage → review-only comparison", async () => {
    const result = await extractLocalPublicPdf(input());
    const left = selectExactPageObservation({
      page: result.pages[0], startUtf16: result.pages[0].extractedText!.indexOf("The library"),
      endUtf16: result.pages[0].extractedText!.indexOf("The library") + "The library".length,
    });
    const right = selectExactPageObservation({
      page: result.pages[2], startUtf16: result.pages[2].extractedText!.indexOf("A second"),
      endUtf16: result.pages[2].extractedText!.indexOf("A second") + "A second".length,
    });
    const comparison = draftEvidenceComparison({
      id: "harmless-review", question: "Are both passages correctly located?",
      left: left.observation, right: right.observation,
      comparisonType: "missing_context", explanation: "Review two physical pages.",
      limitations: "Synthetic public fixture; original-page privacy review still required.",
    });
    expect(comparison.left.source.pdfPage).toBe(1);
    expect(comparison.right.source.pdfPage).toBe(3);
    expect(comparison.left.source.sha256).toBe(result.original.originalBytesSha256);
    expect(comparison.sharingStatus).toBe("hold_for_privacy_and_source_review");
    expect(() => selectExactPageObservation({
      page: result.pages[1], startUtf16: 0, endUtf16: 5,
    })).toThrow("research_page_not_extractable_for_quote");
  });
  it("rejects impostor HTML, unsafe URL, malformed PDF", async () => {
    await expect(extractLocalPublicPdf({
      ...input(), bytes: new TextEncoder().encode("<html>age gate</html>"),
    })).rejects.toThrow("invalid_pdf_binary_signature");
    await expect(extractLocalPublicPdf({
      ...input(), sourceUri: "http://example.org/test.pdf",
    })).rejects.toThrow("invalid_pdf_source_uri");
    await expect(extractLocalPublicPdf({
      ...input(), bytes: new TextEncoder().encode("%PDF-1.4\nnot a PDF"),
    })).rejects.toThrow("pdf_metadata_failed_or_timed_out");
  });
});

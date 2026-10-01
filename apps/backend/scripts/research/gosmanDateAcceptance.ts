/**
 * Manual, offline acceptance against two public GovInfo PDFs.
 * Download the source URLs in the manifest yourself; this script never fetches.
 * Usage: tsx apps/backend/scripts/research/gosmanDateAcceptance.ts <Doc-2031.pdf> <Doc-115.pdf>
 */
import { readFile } from "node:fs/promises";
import { extractLocalPublicPdf } from "../../lib/research/localPdfParser";
import { findSourceAnchoredTransferDateConflicts } from "../../lib/research/sourceAnchoredDateConflict";

const manifest = [
  {
    documentId: "Case-01-30953-Doc-2031",
    sourceUri: "https://www.govinfo.gov/content/pkg/USCOURTS-flsb-9_01-bk-30953/pdf/USCOURTS-flsb-9_01-bk-30953-0.pdf",
    sha256: "e399dd4b795d5e8d3274d42aa798272223f782421875e071885e96011fac2967",
    pages: 8,
  },
  {
    documentId: "Adv-03-3228-Doc-115",
    sourceUri: "https://www.govinfo.gov/content/pkg/USCOURTS-flsb-9_03-ap-03228/pdf/USCOURTS-flsb-9_03-ap-03228-0.pdf",
    sha256: "58388eea58622115ae1a1454b6d33dfa87e3f10f02202a4bea74d405eeb508ae",
    pages: 6,
  },
] as const;

async function main(): Promise<void> {
  if (process.argv.length !== 4) throw new Error("provide_two_local_public_pdf_paths");
  const captures = await Promise.all(manifest.map(async (item, i) => {
    const bytes = new Uint8Array(await readFile(process.argv[i + 2]));
    const parsed = await extractLocalPublicPdf({
      sourceUri: item.sourceUri, documentId: item.documentId, bytes,
    });
    if (parsed.original.originalBytesSha256 !== item.sha256 ||
        parsed.original.declaredPageCount !== item.pages) {
      throw new Error("source_version_changed_hold:" + item.documentId);
    }
    return parsed;
  }));
  const candidates = findSourceAnchoredTransferDateConflicts({
    eventKey: "H80", subject: "North County Road",
    pages: captures.flatMap(c => c.pages),
  }).filter(c => c.comparison.left.source.documentId === "Adv-03-3228-Doc-115" &&
    c.comparison.right.source.documentId === "Adv-03-3228-Doc-115" &&
    c.comparison.left.source.pdfPage === 3 &&
    c.comparison.right.source.pdfPage === 4);
  if (!candidates.some(c => new Set(c.dates).size === 2 &&
      c.dates.includes("1999-07-30") && c.dates.includes("1999-10-10") &&
      c.comparison.reviewStatus === "needs_independent_verification" &&
      c.status === "hold_for_original_page_and_instrument_review")) {
    throw new Error("date_conflict_acceptance_failed");
  }
  // Do not print extracted page content or names. A date conflict is a
  // review candidate, not a factual adjudication or misconduct allegation.
  process.stdout.write(JSON.stringify({
    status: "PASS", eventKey: "H80", sourceVersions: captures.map(c => ({
      documentId: c.original.documentId,
      sha256: c.original.originalBytesSha256,
      pages: c.original.declaredPageCount,
    })),
    candidate: { dates: ["1999-07-30", "1999-10-10"], pdfPages: [3, 4],
      documentId: "Adv-03-3228-Doc-115", sourceFamilyCount: 1,
      disposition: "HOLD: original 2005 opinion and transfer instrument needed" },
  }, null, 2) + "\n");
}
main().catch(err => {
  process.stderr.write((err instanceof Error ? err.message : "unknown_error") + "\n");
  process.exitCode = 1;
});

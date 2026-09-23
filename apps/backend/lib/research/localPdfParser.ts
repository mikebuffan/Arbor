/**
 * LOCAL/SANDBOX-ONLY public PDF extraction via the established Poppler CLI.
 *
 * Not wired to a production route, Edge Function, scheduled worker or browser.
 * Requires pdfinfo, pdftotext and pdfimages in an isolated runtime.
 * Do not run on private, restricted, untrusted or exceptionally large corpora
 * without a separately reviewed threat model and execution sandbox.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  capturePdfOriginalBytes,
  createPdfPageEvidenceRecords,
  MAX_PDF_SOURCE_BYTES,
  type PdfOriginalCapture,
  type PdfExtractedPage,
  type PdfPageEvidenceRecord,
} from "./pdfPageProvenance";

const execFileAsync = promisify(execFile);

/** Local ingestion cap, not a promise that a production worker can parse it. */
export const MAX_LOCAL_PDF_PAGES = 128;
const MAX_PAGE_OUTPUT_BYTES = 600_000;
const POPPLER_TIMEOUT_MS = 12_000;

export type LocalPdfExtraction = {
  original: PdfOriginalCapture;
  pages: PdfPageEvidenceRecord[];
  parser: "poppler-local-unreviewed" | "poppler-isolated-unreviewed";
};

/** No shell, interpolated command, remote fetch or logged document text. */
async function poppler(command: string, args: string[], operation: string):
    Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      encoding: "utf8",
      timeout: POPPLER_TIMEOUT_MS,
      maxBuffer: MAX_PAGE_OUTPUT_BYTES,
      windowsHide: true,
    });
    return stdout;
  } catch (err) {
    // Preserve a useful, sanitized reason without copying private PDF content
    // or PDF parser stderr to application logs.
    if (err instanceof Error && "code" in err &&
        (err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("pdf_poppler_not_installed");
    }
    throw new Error("pdf_" + operation + "_failed_or_timed_out");
  }
}

/**
 * Extracts each physical PDF page INDEPENDENTLY. Empty text is only labelled
 * image_only if Poppler lists an image on that page; truly blank or unclassified
 * pages remain extraction_failed/no_extractable_text_or_blank_page.
 *
 * Page images, folios and claims require independent review; a successful
 * text-layer extraction does not authorize publication or OCR.
 */
export type PopplerRunner = (command: string, args: string[], operation: string) => Promise<string>;

export async function extractLocalPublicPdf(input: {
  sourceUri: string;
  documentId: string;
  bytes: Uint8Array;
}, options?: { runPoppler?: PopplerRunner }): Promise<LocalPdfExtraction> {
  const runPoppler = options?.runPoppler ?? poppler;
  if (!(input.bytes instanceof Uint8Array) ||
      input.bytes.byteLength < 8 ||
      input.bytes.byteLength > MAX_PDF_SOURCE_BYTES) {
    throw new Error("invalid_pdf_original_byte_length");
  }
  // Validate source URL, source identity, signature and actual checksum
  // BEFORE writing any untrusted PDF bytes to disk.
  await capturePdfOriginalBytes({
    ...input, declaredPageCount: 1,
  });

  const folder = await mkdtemp(join(tmpdir(), "arbor-public-pdf-"));
  const file = join(folder, "input.pdf");
  try {
    await writeFile(file, Buffer.from(input.bytes), {
      flag: "wx", mode: 0o600,
    });
    // An isolated non-root parser can read only this bind-mounted file, not its 0700 host parent.
    if (options?.runPoppler) await chmod(file, 0o444);
    const info = await runPoppler("pdfinfo", [file], "metadata");
    if (/^Encrypted:\s+yes\b/im.test(info)) {
      throw new Error("pdf_encrypted_source_hold");
    }
    const countMatch = info.match(/^Pages:\s+(\d+)\s*$/im);
    if (!countMatch) throw new Error("pdf_page_count_unavailable");
    const declaredPageCount = Number(countMatch[1]);
    if (!Number.isSafeInteger(declaredPageCount) ||
        declaredPageCount < 1 ||
        declaredPageCount > MAX_LOCAL_PDF_PAGES) {
      throw new Error("pdf_local_page_budget_exceeded");
    }
    const original = await capturePdfOriginalBytes({
      ...input, declaredPageCount,
    });
    const inventory = await runPoppler("pdfimages", ["-list", file], "image_inventory");
    const imagePages = new Set<number>();
    // Poppler's tabular inventory lines start with physical page number,
    // image number and image type; the two-line header never matches.
    for (const line of inventory.split(/\r?\n/)) {
      const match = line.match(/^\s*(\d+)\s+\d+\s+(?:image|stencil|mask|smask)\b/);
      if (match) imagePages.add(Number(match[1]));
    }

    const parsedPages: PdfExtractedPage[] = [];
    for (let physicalPdfPage = 1;
         physicalPdfPage <= declaredPageCount; physicalPdfPage++) {
      let text: string;
      try {
        text = await runPoppler("pdftotext", [
          "-f", String(physicalPdfPage),
          "-l", String(physicalPdfPage),
          "-enc", "UTF-8",
          "-layout", "-nopgbrk",
          file, "-",
        ], "page_text");
      } catch (err) {
        if (err instanceof Error &&
            (err.message === "pdf_poppler_not_installed" ||
             err.message.startsWith("pdf_sandbox_"))) throw err;
        parsedPages.push({
          physicalPdfPage, extractionStatus: "extraction_failed",
          errorCode: "pdftotext_error_or_timeout",
        });
        continue;
      }
      const extractedText = text.trim();
      if (extractedText.length > 0 && extractedText.length <= 200_000) {
        parsedPages.push({
          physicalPdfPage, extractionStatus: "text_layer",
          extractedText,
        });
      } else if (extractedText.length > 200_000) {
        parsedPages.push({
          physicalPdfPage, extractionStatus: "extraction_failed",
          errorCode: "pdf_page_text_budget_exceeded",
        });
      } else if (imagePages.has(physicalPdfPage)) {
        parsedPages.push({
          physicalPdfPage, extractionStatus: "image_only",
        });
      } else {
        parsedPages.push({
          physicalPdfPage, extractionStatus: "extraction_failed",
          errorCode: "no_extractable_text_or_blank_page",
        });
      }
    }
    return {
      original,
      pages: createPdfPageEvidenceRecords(original, parsedPages),
      parser: options?.runPoppler ? "poppler-isolated-unreviewed" : "poppler-local-unreviewed",
    };
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

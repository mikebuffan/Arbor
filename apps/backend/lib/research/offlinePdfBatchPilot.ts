/**
 * OFFLINE, LOCAL-ONLY evidence staging for a FIRST small benign/approved PDF batch.
 * Does not fetch URLs, use Supabase, claim an ARK unit, publish a finding, or schedule work.
 * The source URI is operator-supplied and explicitly NOT independently verified here.
 * Run the Poppler parser only on harmless fixtures or in a separately approved sandbox.
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, link, unlink, lstat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { extractLocalPublicPdf } from "./localPdfParser";
import { MAX_PDF_SOURCE_BYTES } from "./pdfPageProvenance";

export type LocalPilotInput = {
  localPath: string;
  sourceUri: string;
  documentId: string;
};
export type LocalPilotResult = {
  index: number;
  status: "staged_review_only" | "already_staged" | "held";
  originalSha256?: string;
  physicalPages?: number;
  textLayerPages?: number;
  imageOnlyPages?: number;
  failedPages?: number;
  reason?: string;
};
const sha256 = (bytes: Uint8Array | string): string =>
  createHash("sha256").update(bytes).digest("hex");

function errCode(error: unknown): string {
  if (error instanceof Error && /^(?:pdf_|invalid_pdf_|incomplete_pdf_|research_|pilot_)/.test(error.message)) {
    return error.message;
  }
  return "pilot_local_source_or_storage_failed";
}

/** Exclusive, crash-recoverable local staging: never overwrite a different artifact. */
async function writeOnce(path: string, bytes: Uint8Array): Promise<boolean> {
  const temp = path + "." + randomUUID() + ".tmp";
  await writeFile(temp, bytes, {flag:"wx",mode:0o600});
  try {
    try {
      await link(temp, path);
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      const existing = await readFile(path);
      if (existing.length !== bytes.length || sha256(existing) !== sha256(bytes)) {
        throw new Error("pilot_existing_artifact_mismatch");
      }
      return false;
    }
  } finally {
    await unlink(temp).catch(() => undefined);
  }
}

/**
 * A local pilot proves PDF -> page inventory -> recoverable protected artifact.
 * Returned refs are NOT production immutable evidence IDs and NOT verified claims.
 * This is intentionally capped at 25 files; large corpora need isolated worker wiring.
 */
export async function stageLocalPdfPilotBatch(input: {
  items: LocalPilotInput[];
  outputDirectory: string;
}): Promise<LocalPilotResult[]> {
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 25 ||
      typeof input.outputDirectory !== "string" || !input.outputDirectory.trim()) {
    throw new Error("pilot_invalid_batch");
  }
  const root = resolve(input.outputDirectory);
  const originals = join(root,"originals");
  const records = join(root,"records");
  await mkdir(originals,{recursive:true,mode:0o700});
  await mkdir(records,{recursive:true,mode:0o700});
  const results: LocalPilotResult[] = [];
  for (const [index,item] of input.items.entries()) {
    try {
      if (!item || typeof item.localPath !== "string" || !item.localPath.trim() ||
          typeof item.sourceUri !== "string" || !item.sourceUri.trim() ||
          typeof item.documentId !== "string" || !item.documentId.trim()) {
        throw new Error("pilot_invalid_item");
      }
      const metadata = await lstat(item.localPath);
      if (!metadata.isFile() || metadata.isSymbolicLink() ||
          metadata.size < 8 || metadata.size > MAX_PDF_SOURCE_BYTES) {
        throw new Error("pilot_invalid_local_source");
      }
      const bytes = await readFile(item.localPath);
      const parsed = await extractLocalPublicPdf({
        sourceUri:item.sourceUri, documentId:item.documentId,bytes,
      });
      const sha = sha256(bytes);
      if (parsed.original.originalBytesSha256 !== sha) throw new Error("pilot_hash_mismatch");
      const sourceKey = sha256(JSON.stringify([item.sourceUri,item.documentId,sha]));
      const originalPath = join(originals,sha+".pdf");
      const recordPath = join(records,sourceKey+".json");
      const record = {
        schema:"arbor.local_pdf_review_only.v1",
        sourceUri:item.sourceUri,
        documentId:item.documentId,
        sourceUriVerification:"operator_supplied_not_independently_fetched",
        artifactStatus:"hold_for_original_page_image_and_privacy_review",
        originalBytesSha256:sha,
        originalByteLength:bytes.length,
        localOriginalArtifact:"originals/"+sha+".pdf",
        physicalPageCount:parsed.original.declaredPageCount,
        pages:parsed.pages,
      };
      await writeOnce(originalPath,bytes);
      const staged = await writeOnce(recordPath,Buffer.from(JSON.stringify(record,null,2)+"\n"));
      results.push({
        index,status:staged?"staged_review_only":"already_staged",
        originalSha256:sha,physicalPages:parsed.pages.length,
        textLayerPages:parsed.pages.filter(p=>p.extractionStatus==="text_layer").length,
        imageOnlyPages:parsed.pages.filter(p=>p.extractionStatus==="image_only").length,
        failedPages:parsed.pages.filter(p=>p.extractionStatus==="extraction_failed").length,
      });
    } catch (error) {
      results.push({index,status:"held",reason:errCode(error)});
    }
  }
  return results;
}

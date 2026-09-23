/** Local benign/approved PDF pilot. NEVER run untrusted PDFs outside a reviewed sandbox. */
import { readFile } from "node:fs/promises";
import { stageLocalPdfPilotBatch, type LocalPilotInput } from "../../lib/research/offlinePdfBatchPilot";

async function main(): Promise<void> {
  if (process.argv.length !== 4) {
    throw new Error("usage: tsx scripts/research/offline-pdf-batch-pilot.ts <local-list.json> <private-output-dir>");
  }
  const items = JSON.parse(await readFile(process.argv[2],"utf8")) as LocalPilotInput[];
  const results = await stageLocalPdfPilotBatch({
    items,outputDirectory:process.argv[3],
    sandboxImageRef:process.env.PDF_SANDBOX_IMAGE_REF,
  });
  // No extracted text, local paths, or source URIs on stdout.
  process.stdout.write(JSON.stringify({
    staged:results.filter(x=>x.status==="staged_review_only").length,
    alreadyStaged:results.filter(x=>x.status==="already_staged").length,
    held:results.filter(x=>x.status==="held").length,
    results,
  },null,2)+"\n");
  if (results.some(x=>x.status==="held")) process.exitCode=2;
}
void main().catch((error:unknown)=>{
  // No stack that could contain sensitive local paths.
  process.stderr.write(error instanceof Error && error.message.startsWith("pilot_")
    ? error.message+"\n" : "pilot_batch_setup_failed\n");
  process.exitCode=1;
});

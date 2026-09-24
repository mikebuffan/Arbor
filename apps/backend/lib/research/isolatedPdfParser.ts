/**
 * Pinned non-root/no-egress Poppler runner for separately approved PDF ingestion.
 * Uses the EXISTING parser's provenance, page inventory and review HOLD logic.
 * This runner is not a source fetcher, evidence store, scheduler or live approval.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { basename } from "node:path";
import { extractLocalPublicPdf, type LocalPdfExtraction, type PopplerRunner } from "./localPdfParser";

const execFileAsync=promisify(execFile);
const TOOL_PATHS = {
  pdfinfo:"/usr/bin/pdfinfo",
  pdftotext:"/usr/bin/pdftotext",
  pdfimages:"/usr/bin/pdfimages",
} as const;
const HOST_INPUT_NAME="input.pdf";
const ISOLATED_INPUT="/work/source.pdf";
const MAX_STDOUT=600_000;
const TIMEOUT_MS=20_000;

export function isolatedPopplerArguments(args:{
  imageRef:string;command:string;hostFile:string;toolArgs:string[];
}):string[] {
  if (!/^sha256:[a-f0-9]{64}$/.test(args.imageRef)) {
    throw new Error("pdf_sandbox_image_digest_required");
  }
  if (!(args.command in TOOL_PATHS) ||
      basename(args.hostFile)!==HOST_INPUT_NAME ||
      !Array.isArray(args.toolArgs) ||
      args.toolArgs.filter(x=>x===args.hostFile).length!==1) {
    throw new Error("pdf_sandbox_invalid_parser_request");
  }
  const command=TOOL_PATHS[args.command as keyof typeof TOOL_PATHS];
  return [
    "run","--rm",
    "--network","none","--read-only","--cap-drop","ALL",
    "--security-opt","no-new-privileges:true",
    "--user","65532:65532","--memory","256m","--memory-swap","256m",
    "--pids-limit","64","--cpus","1.0","--ulimit","nofile=64:64",
    "--tmpfs","/tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777",
    "--mount",`type=bind,src=${args.hostFile},dst=${ISOLATED_INPUT},readonly`,
    "--workdir","/work","--entrypoint",command,args.imageRef,
    ...args.toolArgs.map(x=>x===args.hostFile?ISOLATED_INPUT:x),
  ];
}

/** Docker must already contain the reviewed locally built pinned image ID. */
export async function extractIsolatedPublicPdf(input:{
  sourceUri:string;documentId:string;bytes:Uint8Array;
},imageRef:string):Promise<LocalPdfExtraction> {
  if (!/^sha256:[a-f0-9]{64}$/.test(imageRef)) {
    throw new Error("pdf_sandbox_image_digest_required");
  }
  const runner:PopplerRunner=async(command,toolArgs,operation)=>{
    const hostFile=toolArgs.find(x=>typeof x==="string"&&basename(x)===HOST_INPUT_NAME);
    if (!hostFile) throw new Error("pdf_sandbox_invalid_parser_request");
    const dockerArgs=isolatedPopplerArguments({
      imageRef,command,hostFile,toolArgs,
    });
    try {
      const {stdout}=await execFileAsync("docker",dockerArgs,{
        encoding:"utf8",timeout:TIMEOUT_MS,maxBuffer:MAX_STDOUT,
        killSignal:"SIGKILL",windowsHide:true,
      });
      return stdout;
    } catch {
      // Docker stdout/stderr may contain source material; never echo the original error.
      throw new Error("pdf_sandbox_"+operation+"_failed_or_timed_out");
    }
  };
  return extractLocalPublicPdf(input,{runPoppler:runner});
}

import fs from "node:fs/promises";
import path from "node:path";
import {createHash,randomUUID} from "node:crypto";
import {z} from "zod";
import {preflightHistoricalSources} from "./preflight";
import {parseConversationObject} from "./parseChatGPT";
import type {HistoricalTurnInput} from "../../lib/memory/historicalIngest";

const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const identity=(t:HistoricalTurnInput)=>JSON.stringify([t.source,t.sourceThreadId,t.sourceMessageId]);
const Target=z.object({userId:z.string().uuid(),projectId:z.string().uuid()}).strict();
const Options=z.object({maxMessages:z.number().int().min(1).max(200).default(100),
  maxBytes:z.number().int().min(1000).max(1000000).default(262144)}).strict();
export type ArchiveTarget=z.infer<typeof Target>;
export type ArchiveBatch={index:number;start:number;count:number;sha256:string;bytes:number;oversizedSingleMessage:boolean};
export type ArchiveManifest={schemaVersion:1;target:ArchiveTarget;parser:"chatgpt-normalized-active-branch-v1";
  sources:{file:string;bytes:number;sha256:string}[];options:z.infer<typeof Options>;
  uniqueTurns:number;duplicateTurns:number;normalizedSha256:string;batches:ArchiveBatch[];scope:string;fingerprint:string};
export type ArchiveCheckpoint={schemaVersion:1;fingerprint:string;nextBatch:number};
export type PreparedArchive={manifest:ArchiveManifest;turns:HistoricalTurnInput[]};

/** Source preparation only. Never invokes the legacy extractor or overwriting upsert. */
export async function prepareResumableArchive(input:{files:string[];target:ArchiveTarget;
  maxMessages?:number;maxBytes?:number}):Promise<PreparedArchive>{
  const target=Target.parse(input.target),options=Options.parse({maxMessages:input.maxMessages,maxBytes:input.maxBytes});
  if(!input.files.length||new Set(input.files.map(f=>path.basename(f))).size!==input.files.length)
    throw Error("archive_sources_missing_or_ambiguous");
  const inventory=await preflightHistoricalSources(input.files);
  if(!inventory.ready)throw Error("archive_preflight_failed");
  const unique=new Map<string,HistoricalTurnInput>(),messageOwners=new Map<string,string>();let duplicateTurns=0;
  for(const [i,file] of [...input.files].sort().entries()){
    const bytes=await fs.readFile(file);
    if(createHash("sha256").update(bytes).digest("hex")!==inventory.files[i].sha256)throw Error("archive_source_changed_during_prepare");
    for(const conversation of JSON.parse(bytes.toString("utf8"))){
      for(const [sourceMessageIndex,t] of parseConversationObject(conversation).entries()){
        const turn:HistoricalTurnInput={source:t.source,sourceThreadId:t.sourceConversationId,sourceMessageId:t.sourceMessageId,
          sourceMessageIndex,role:t.role==="tool"?"system":t.role,content:t.content,occurredAt:t.createdAt};
        const key=identity(turn),messageKey=JSON.stringify([turn.source,turn.sourceMessageId]);
        if(messageOwners.has(messageKey)&&messageOwners.get(messageKey)!==turn.sourceThreadId)throw Error("archive_cross_thread_message_collision");
        messageOwners.set(messageKey,turn.sourceThreadId);
        const previous=unique.get(key);
        if(previous){if(digest(previous)!==digest(turn))throw Error("archive_source_message_conflict");duplicateTurns++;}
        else unique.set(key,turn);
      }
    }
  }
  const turns=[...unique.values()].sort((a,b)=>{
    const time=a.occurredAt===null?(b.occurredAt===null?0:1):b.occurredAt===null?-1:a.occurredAt.localeCompare(b.occurredAt);
    return time||a.sourceThreadId.localeCompare(b.sourceThreadId)||a.sourceMessageIndex-b.sourceMessageIndex||identity(a).localeCompare(identity(b));
  });
  const batches:ArchiveBatch[]=[];let start=0;
  while(start<turns.length){
    let end=start+1,bytes=Buffer.byteLength(JSON.stringify(turns.slice(start,end)));
    while(end<turns.length&&end-start<options.maxMessages){
      const nextBytes=bytes+1+Buffer.byteLength(JSON.stringify(turns[end]));
      if(nextBytes>options.maxBytes)break;bytes=nextBytes;end++;
    }
    batches.push({index:batches.length,start,count:end-start,bytes,sha256:digest(turns.slice(start,end)),
      oversizedSingleMessage:bytes>options.maxBytes});start=end;
  }
  const body={schemaVersion:1 as const,target,parser:"chatgpt-normalized-active-branch-v1" as const,
    sources:inventory.files.map(({file,bytes,sha256})=>({file,bytes,sha256})),options,uniqueTurns:turns.length,
    duplicateTurns,normalizedSha256:digest(turns),batches,scope:inventory.scope};
  return {manifest:{...body,fingerprint:digest(body)},turns};
}

/** Reconstruct from original bytes before trusting any saved manifest or resume position. */
export async function verifyResumableArchive(input:{files:string[];target:ArchiveTarget;manifest:ArchiveManifest}){
  const {fingerprint,...body}=input.manifest;
  if(digest(body)!==fingerprint)throw Error("archive_manifest_changed");
  if(digest(Target.parse(input.target))!==digest(input.manifest.target))throw Error("archive_target_mismatch");
  const current=await prepareResumableArchive({files:input.files,target:input.target,...input.manifest.options});
  if(current.manifest.fingerprint!==fingerprint)throw Error("archive_sources_or_parser_changed");
  return current;
}

export interface VerifiedArchiveTransport {
  /** Must atomically reject source conflicts; exact repeats must preserve existing rows.
   * No embeddings, extraction, correction promotion or legacy overwriting upsert. */
  applyExactBatch(target:ArchiveTarget,turns:HistoricalTurnInput[]):Promise<void>;
  /** Full content, role, timestamp, identity and source-position match; failure rejects. */
  verifyExactBatch(target:ArchiveTarget,turns:HistoricalTurnInput[]):Promise<void>;
}

/** Source transport coordinator, not an ARK job or developmental analysis engine.
 * Receipts advance only after exact destination verification. Checkpoints never prove reading. */
export async function transportResumableArchive(input:{files:string[];target:ArchiveTarget;manifest:ArchiveManifest;
  checkpoint:ArchiveCheckpoint|null;transport:VerifiedArchiveTransport;
  saveCheckpoint:(value:ArchiveCheckpoint)=>Promise<void>;maxBatches?:number;signal?:AbortSignal}){
  const prepared=await verifyResumableArchive(input),{manifest,turns}=prepared;
  const checkpoint=z.object({schemaVersion:z.literal(1),fingerprint:z.string(),nextBatch:z.number().int().nonnegative()}).strict()
    .parse(input.checkpoint??{schemaVersion:1,fingerprint:manifest.fingerprint,nextBatch:0});
  if(checkpoint.fingerprint!==manifest.fingerprint||checkpoint.nextBatch>manifest.batches.length)throw Error("archive_checkpoint_mismatch");
  const maxBatches=z.number().int().min(1).max(1000).parse(input.maxBatches??1);
  const assertRunning=()=>{if(input.signal?.aborted)throw Error("archive_transport_aborted");};
  // A local offset alone cannot silently skip data; reverify every claimed completed batch.
  for(const batch of manifest.batches.slice(0,checkpoint.nextBatch)){assertRunning();
    await input.transport.verifyExactBatch(manifest.target,turns.slice(batch.start,batch.start+batch.count));}
  let nextBatch=checkpoint.nextBatch;
  for(const batch of manifest.batches.slice(nextBatch,nextBatch+maxBatches)){
    assertRunning();
    const payload=turns.slice(batch.start,batch.start+batch.count);
    await input.transport.applyExactBatch(manifest.target,payload);
    assertRunning();
    await input.transport.verifyExactBatch(manifest.target,payload);
    assertRunning();
    const next:ArchiveCheckpoint={schemaVersion:1,fingerprint:manifest.fingerprint,nextBatch:batch.index+1};
    await input.saveCheckpoint(next);nextBatch=next.nextBatch;
  }
  return {fingerprint:manifest.fingerprint,nextBatch,totalBatches:manifest.batches.length,
    transportComplete:nextBatch===manifest.batches.length,readingComplete:false,modelCalls:false};
}

/** A corrupt/unreadable checkpoint is an error, never a silent restart at zero. */
export async function readArchiveCheckpoint(file:string):Promise<ArchiveCheckpoint|null>{
  try{return JSON.parse(await fs.readFile(file,"utf8"));}
  catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return null;throw error;}
}

/** Caller supplies a private destination. Write + fsync + rename keeps interruption atomic. */
export async function saveArchiveCheckpoint(file:string,value:ArchiveCheckpoint){
  const temporary=`${file}.${randomUUID()}.tmp`;
  try{
    const handle=await fs.open(temporary,"wx",0o600);
    try{await handle.writeFile(JSON.stringify(value,null,2));await handle.sync();}finally{await handle.close();}
    await fs.rename(temporary,file);
    const directory=await fs.open(path.dirname(file),"r");
    try{await directory.sync();}finally{await directory.close();}
  }finally{await fs.rm(temporary,{force:true});}
}

import fs from "node:fs/promises";
import {createHash} from "node:crypto";
import {preflightHistoricalSources} from "./preflight";
import {parseConversationObject} from "./parseChatGPT";
import type {HistoricalTurnInput} from "../../lib/memory/historicalIngest";

export type HistoricalSelection={sourceThreadId:string;sourceMessageId:string};
export type BoundedHistoricalPlan={
  schemaVersion:1;userId:string;projectId:string;
  sources:{file:string;sha256:string;bytes:number}[];
  turns:HistoricalTurnInput[];fingerprint:string;
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key=(s:HistoricalSelection)=>JSON.stringify([s.sourceThreadId,s.sourceMessageId]);
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** Explicit selection, no extraction, embeddings, database or checkpoint writes. */
export async function buildBoundedHistoricalPlan(input:{
  files:string[];userId:string;projectId:string;selection:HistoricalSelection[];
}):Promise<BoundedHistoricalPlan>{
  if(!uuid.test(input.userId)||!uuid.test(input.projectId))throw Error("invalid_import_owner_or_project");
  if(input.selection.length<1||input.selection.length>20)throw Error("bounded_import_requires_1_to_20_messages");
  const selected=new Set(input.selection.map(key));
  if(selected.size!==input.selection.length)throw Error("duplicate_import_selection");
  const inventory=await preflightHistoricalSources(input.files);
  if(!inventory.ready)throw Error("historical_source_preflight_failed");
  const found=new Map<string,HistoricalTurnInput>();
  for(const [fileIndex,file] of [...input.files].sort().entries()){
    const bytes=await fs.readFile(file);
    const expected=inventory.files[fileIndex];
    if(expected.sha256!==createHash("sha256").update(bytes).digest("hex"))throw Error("historical_source_changed_during_plan");
    for(const c of JSON.parse(bytes.toString("utf8"))){
      const turns=parseConversationObject(c);
      turns.forEach((t,index)=>{
        const identity=key({sourceThreadId:t.sourceConversationId,sourceMessageId:t.sourceMessageId});
        if(selected.has(identity))found.set(identity,{source:t.source,sourceThreadId:t.sourceConversationId,
          sourceMessageId:t.sourceMessageId,sourceMessageIndex:index,role:t.role==="tool"?"system":t.role,
          content:t.content,occurredAt:t.createdAt});
      });
    }
  }
  if(found.size!==selected.size)throw Error("selected_historical_message_missing");
  const body={schemaVersion:1 as const,userId:input.userId,projectId:input.projectId,
    sources:inventory.files.map(({file,sha256,bytes})=>({file,sha256,bytes})),
    turns:[...found.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([,turn])=>turn)};
  return {...body,fingerprint:digest(body)};
}

export async function verifyBoundedHistoricalPlan(input:{
  plan:BoundedHistoricalPlan;files:string[];userId:string;projectId:string;
}){
  if(input.plan.userId!==input.userId||input.plan.projectId!==input.projectId)throw Error("historical_plan_scope_mismatch");
  const {fingerprint,...body}=input.plan;
  if(digest(body)!==fingerprint)throw Error("historical_plan_payload_changed");
  const current=await buildBoundedHistoricalPlan({...input,selection:input.plan.turns});
  if(current.fingerprint!==fingerprint)throw Error("historical_plan_sources_changed");
  return current;
}

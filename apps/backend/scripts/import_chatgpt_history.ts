/**
 * Resumable ChatGPT export -> historical_conversation_turns importer.
 *
 * Usage:
 *   pnpm tsx apps/backend/scripts/import_chatgpt_history.ts <file-or-directory> <user-id> <project-id>
 *
 * Safe to rerun: source-message identity is unique and rows are upserted.
 * Embeddings are intentionally deferred; pattern-hop lexical retrieval works immediately
 * and semantic embeddings can be backfilled independently.
 */
import { createClient } from "@supabase/supabase-js";
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import pkg from "stream-json";
import streamArrayPkg from "stream-json/streamers/StreamArray";
const { parser } = pkg;
const { streamArray } = streamArrayPkg;

type Row = {
  user_id:string; project_id:string; source:string;
  source_thread_id:string; source_message_id:string;
  source_message_index:number|null; role:string; content:string;
  occurred_at:string|null;
};

function textFromMessage(message:any):string {
  const content=message?.content;
  if(!content) return "";
  if(typeof content==="string") return content;
  const parts=Array.isArray(content.parts)?content.parts:[];
  return parts.map((part:any)=>{
    if(typeof part==="string") return part;
    if(part && typeof part.text==="string") return part.text;
    return "";
  }).filter(Boolean).join("\n").trim();
}

function linearizeConversation(conv:any):Row[] {
  const mapping=conv?.mapping ?? {};
  const nodes=Object.values(mapping) as any[];
  const usable=nodes.filter(node=>{
    const role=node?.message?.author?.role;
    return node?.message && ["user","assistant","system"].includes(role) && textFromMessage(node.message);
  });
  usable.sort((a,b)=>{
    const at=Number(a?.message?.create_time ?? 0);
    const bt=Number(b?.message?.create_time ?? 0);
    if(at!==bt) return at-bt;
    return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
  });
  const threadId=String(conv?.id ?? conv?.conversation_id ?? conv?.title ?? "unknown");
  return usable.map((node,index)=>{
    const m=node.message;
    const ts=Number(m?.create_time ?? 0);
    return {
      user_id:userId,
      project_id:projectId,
      source:"chatgpt_export",
      source_thread_id:threadId,
      source_message_id:String(m?.id ?? node?.id),
      source_message_index:index,
      role:String(m?.author?.role),
      content:textFromMessage(m),
      occurred_at:ts>0?new Date(ts*1000).toISOString():null,
    };
  });
}

const [, , input, userId, projectId]=process.argv;
if(!input || !userId || !projectId) throw new Error("Expected <file-or-directory> <user-id> <project-id>");
const url=process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url || !key) throw new Error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if(!existsSync(input)) throw new Error("Input does not exist: "+input);
const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const files=statSync(input).isDirectory()
  ? readdirSync(input).filter(n=>/^conversations(?:-\d+)?(?:\(\d+\))?\.json$/i.test(n)).sort().map(n=>join(input,n))
  : [input];

let conversations=0, turns=0;
for(const file of files){
  console.log("[history-import] reading",basename(file));
  const pipeline=createReadStream(file).pipe(parser()).pipe(streamArray());
  for await (const item of pipeline as any){
    const rows=linearizeConversation(item.value);
    conversations++;
    for(let i=0;i<rows.length;i+=250){
      const batch=rows.slice(i,i+250);
      const {error}=await supabase.from("historical_conversation_turns").upsert(batch,{
        onConflict:"user_id,project_id,source,source_thread_id,source_message_id",
        ignoreDuplicates:false,
      });
      if(error) throw error;
      turns+=batch.length;
    }
    if(conversations%100===0) console.log("[history-import]",{conversations,turns});
  }
}
console.log("[history-import] complete",{files:files.length,conversations,turns});

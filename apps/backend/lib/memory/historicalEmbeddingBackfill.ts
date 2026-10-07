import {createHash} from "node:crypto";
import type {SupabaseClient} from "@supabase/supabase-js";
import {assertProjectOwnedByUser} from "@/lib/auth/ownership";

export const HISTORICAL_EMBEDDING_BACKFILL_VERSION=1 as const;
const hash=(value:string)=>createHash("sha256").update(value).digest("hex");
type Row={id:string;source:string;source_thread_id:string;source_message_id:string;source_message_index:number|null;
 role:string;content:string;occurred_at:string|null;embedding:unknown|null};

export type HistoricalEmbeddingBackfillItem={
 id:string;source:string;sourceThreadId:string;sourceMessageId:string;sourceMessageIndex:number|null;
 contentSha256:string;role:string;occurredAt:string|null;
};
export type HistoricalEmbeddingBackfillPlan={
 version:typeof HISTORICAL_EMBEDDING_BACKFILL_VERSION;userId:string;projectId:string;items:HistoricalEmbeddingBackfillItem[];
};

export async function planHistoricalEmbeddingBackfill(input:{supabase:SupabaseClient;userId:string;projectId:string;limit?:number}):
 Promise<HistoricalEmbeddingBackfillPlan>{
 await assertProjectOwnedByUser(input.supabase,input.userId,input.projectId);
 const limit=Math.max(1,Math.min(input.limit??24,100));
 const {data,error}=await input.supabase.from("historical_conversation_turns")
  .select("id,source,source_thread_id,source_message_id,source_message_index,role,content,occurred_at,embedding")
  .eq("user_id",input.userId).eq("project_id",input.projectId).is("embedding",null)
  .order("occurred_at",{ascending:true,nullsFirst:false}).order("id",{ascending:true}).limit(limit);
 if(error)throw error;
 const items=((data??[]) as Row[]).map(row=>({id:row.id,source:row.source,sourceThreadId:row.source_thread_id,
  sourceMessageId:row.source_message_id,sourceMessageIndex:row.source_message_index,contentSha256:hash(row.content),
  role:row.role,occurredAt:row.occurred_at}));
 return{version:HISTORICAL_EMBEDDING_BACKFILL_VERSION,userId:input.userId,projectId:input.projectId,items};
}

export async function applyHistoricalEmbeddingBackfill(input:{
 supabase:SupabaseClient;userId:string;projectId:string;plan:HistoricalEmbeddingBackfillPlan;enabled:boolean;
 embedBatch:(texts:string[])=>Promise<number[][]>;now?:()=>string;
}){
 if(!input.enabled)throw Error("historical_embedding_backfill_disabled");
 if(input.plan.version!==HISTORICAL_EMBEDDING_BACKFILL_VERSION||
    input.plan.userId!==input.userId||input.plan.projectId!==input.projectId)
  throw Error("historical_embedding_backfill_scope_mismatch");
 await assertProjectOwnedByUser(input.supabase,input.userId,input.projectId);
 let applied=0,alreadyEmbedded=0;
 for(const item of input.plan.items){
  const {data,error}=await input.supabase.from("historical_conversation_turns")
   .select("id,source,source_thread_id,source_message_id,source_message_index,role,content,occurred_at,embedding")
   .eq("user_id",input.userId).eq("project_id",input.projectId).eq("id",item.id).maybeSingle();
  if(error)throw error;if(!data)throw Error("historical_embedding_source_missing");
  const row=data as Row;
  if(row.source!==item.source||row.source_thread_id!==item.sourceThreadId||row.source_message_id!==item.sourceMessageId||
     row.source_message_index!==item.sourceMessageIndex||hash(row.content)!==item.contentSha256)
    throw Error("historical_embedding_source_changed");
  if(row.embedding!=null){alreadyEmbedded++;continue;}
  const vectors=await input.embedBatch([["role:"+row.role,row.occurred_at?"time:"+row.occurred_at:"",row.content]
    .filter(Boolean).join("\n")]);
  const embedding=vectors[0];
  if(!Array.isArray(embedding)||embedding.length===0||embedding.some(value=>!Number.isFinite(value)))
    throw Error("historical_embedding_invalid_vector");
  const {data:written,error:writeError}=await input.supabase.from("historical_conversation_turns")
   .update({embedding,updated_at:(input.now??(()=>new Date().toISOString()))()})
   .eq("user_id",input.userId).eq("project_id",input.projectId).eq("id",item.id).is("embedding",null)
   .select("id").maybeSingle();
  if(writeError)throw writeError;
  if(!written){
   const {data:after,error:afterError}=await input.supabase.from("historical_conversation_turns")
    .select("embedding").eq("user_id",input.userId).eq("project_id",input.projectId).eq("id",item.id).maybeSingle();
   if(afterError)throw afterError;
   if(after?.embedding==null)throw Error("historical_embedding_write_not_confirmed");
   alreadyEmbedded++;
  }else applied++;
 }
 return{version:HISTORICAL_EMBEDDING_BACKFILL_VERSION,applied,alreadyEmbedded,remainingPlanItems:0};
}

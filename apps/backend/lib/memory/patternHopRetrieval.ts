import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/memory/embeddings";

export type HistoricalHopResult = {
  id: string;
  source: string;
  sourceThreadId: string;
  sourceMessageId: string;
  sourceMessageIndex: number | null;
  role: "user" | "assistant" | "system";
  content: string;
  occurredAt: string | null;
  similarity: number;
};

export async function searchHistoricalHopEvidence(params:{
  supabase: SupabaseClient;
  userId:string;
  projectId:string;
  clue:string;
  limit?:number;
}):Promise<HistoricalHopResult[]> {
  const embedding=await embedText(params.clue);
  const {data,error}=await params.supabase.rpc("match_historical_conversation_turns",{
    p_user_id:params.userId,
    p_project_id:params.projectId,
    p_query_embedding:embedding,
    p_match_count:Math.max(1,Math.min(params.limit ?? 12,50)),
  });
  if(error) throw error;
  return (data ?? []).map((row:any)=>({
    id:String(row.id),source:String(row.source),sourceThreadId:String(row.source_thread_id),
    sourceMessageId:String(row.source_message_id),sourceMessageIndex:row.source_message_index == null ? null : Number(row.source_message_index),
    role:row.role,content:String(row.content),occurredAt:row.occurred_at ?? null,similarity:Number(row.similarity ?? 0),
  }));
}

export function classifyHistoricalEvidence(role:"user"|"assistant"|"system", retrospective=false) {
  if(retrospective) return {evidenceType:"retrospective_statement",epistemicStatus:"retrospective" as const};
  if(role==="user") return {evidenceType:"direct_user_statement",epistemicStatus:"direct" as const};
  if(role==="assistant") return {evidenceType:"direct_assistant_behavior",epistemicStatus:"direct" as const};
  return {evidenceType:"system_context",epistemicStatus:"direct" as const};
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export type AnnabellePassType="diagnostic"|"continuous"|"editing"|"proof"|"voice_integrity";

export function buildReadReceipt(input:{sourceText:string;sourceSha256:string;provenance?:Record<string,unknown>}) {
 const sourceTextSha256=createHash("sha256").update(input.sourceText,"utf8").digest("hex");
 const n=input.sourceText.length;
 if(n<=0) throw new Error("annabelle_read_receipt_empty_source");
 return {source_sha256:input.sourceSha256,source_text_sha256:sourceTextSha256,source_char_count:n,consumed_char_count:n,consumed_start:0,consumed_end:n,receipt_version:1,provenance:input.provenance??{}};
}

export function assertFullConsumption(input:{sourceCharCount:number;consumedStart:number;consumedEnd:number;consumedCharCount:number}) {
 if(input.sourceCharCount<=0||input.consumedStart!==0||input.consumedEnd!==input.sourceCharCount||input.consumedCharCount!==input.sourceCharCount)
   throw new Error("annabelle_read_receipt_requires_full_consumption");
}

export async function issueReadReceipt(input:{
 supabase:SupabaseClient;userId:string;projectId:string;manuscriptId:string;chapterId:string;passType:AnnabellePassType;
 sourceSha256:string;sourceText:string;provenance?:Record<string,unknown>;
}) {
 const {data:chapter,error:ce}=await input.supabase.from("annabelle_chapters").select("id,source_sha256").eq("id",input.chapterId).eq("manuscript_id",input.manuscriptId).eq("project_id",input.projectId).single();
 if(ce)throw ce;if(chapter.source_sha256!==input.sourceSha256)throw new Error("annabelle_read_receipt_source_hash_mismatch");
 const receipt=buildReadReceipt({sourceText:input.sourceText,sourceSha256:input.sourceSha256,provenance:input.provenance});
 assertFullConsumption({sourceCharCount:receipt.source_char_count,consumedStart:receipt.consumed_start,consumedEnd:receipt.consumed_end,consumedCharCount:receipt.consumed_char_count});
 const {data,error}=await input.supabase.from("annabelle_read_receipts").insert({user_id:input.userId,project_id:input.projectId,manuscript_id:input.manuscriptId,chapter_id:input.chapterId,pass_type:input.passType,...receipt}).select("*").single();
 if(error)throw error;
 const {data:checkpoint,error:re}=await input.supabase.rpc("annabelle_reconcile_read_checkpoint",{p_user_id:input.userId,p_project_id:input.projectId,p_manuscript_id:input.manuscriptId,p_pass_type:input.passType});
 if(re)throw re;return {receipt:data,checkpoint};
}

export async function reconcileReadPass(input:{supabase:SupabaseClient;userId:string;projectId:string;manuscriptId:string;passType:AnnabellePassType}) {
 const {data,error}=await input.supabase.rpc("annabelle_reconcile_read_checkpoint",{p_user_id:input.userId,p_project_id:input.projectId,p_manuscript_id:input.manuscriptId,p_pass_type:input.passType});
 if(error)throw error;return data;
}

export async function firstUnreadChapter(input:{supabase:SupabaseClient;userId:string;projectId:string;manuscriptId:string;passType:AnnabellePassType}) {
 await reconcileReadPass(input);
 const {data:cp,error}=await input.supabase.from("annabelle_editorial_checkpoints").select("state").eq("user_id",input.userId).eq("project_id",input.projectId).eq("manuscript_id",input.manuscriptId).eq("pass_type",input.passType).single();
 if(error)throw error;const n=(cp.state as any)?.nextChapter;if(n==null)return null;
 const {data,error:chErr}=await input.supabase.from("annabelle_chapters").select("*").eq("manuscript_id",input.manuscriptId).eq("chapter_number",n).single();
 if(chErr)throw chErr;return data;
}

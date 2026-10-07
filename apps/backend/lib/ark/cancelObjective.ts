import type {SupabaseClient} from "@supabase/supabase-js";
import type {ArkObjective} from "./types";

function object(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("ark_cancel_invalid_response");
 return value as Record<string,unknown>;
}
export async function cancelArkObjective(input:{
 supabase:SupabaseClient;userId:string;projectId:string;objectiveId:string;reason:string;now?:string;
}):Promise<Pick<ArkObjective,"id"|"userId"|"projectId"|"status"|"version">>{
 const reason=input.reason.trim();
 if(!reason||reason.length>1000)throw Error("ark_cancel_reason_required");
 const {data,error}=await input.supabase.rpc("ark_cancel_objective",{
  p_objective_id:input.objectiveId,p_user_id:input.userId,p_project_id:input.projectId,p_reason:reason,
  p_now:input.now??new Date().toISOString(),
 });
 if(error)throw error;
 const row=object(data);
 if(row.id!==input.objectiveId||row.user_id!==input.userId||row.project_id!==input.projectId||row.status!=="cancelled")
  throw Error("ark_cancel_scope_or_state_mismatch");
 return{id:String(row.id),userId:String(row.user_id),projectId:String(row.project_id),status:"cancelled",version:Number(row.version??0)};
}

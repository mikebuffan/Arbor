/**
 * MANUAL ONLY. No cron, no ARK chat unlock and no research ingestion.
 * Run only on a trusted operator host with preview-only service-role creds.
 * Never paste a service-role key into chat or a source file.
 */
import { createClient } from "@supabase/supabase-js";
import { runApprovedArkPreviewCanary } from "../../lib/ark/approvedPreviewCanary";
import { randomUUID } from "node:crypto";

const EXPECTED_PREVIEW_REF="tzbpjbhroxiqftqwatnb";
const EXPECTED_URL="https://"+EXPECTED_PREVIEW_REF+".supabase.co";
const env=process.env;
async function main():Promise<void>{
  if(env.ARK_PREVIEW_CANARY_APPROVED!=="true"){
    throw new Error("preview_canary_operator_approval_required");
  }
  if(env.SUPABASE_URL!==EXPECTED_URL||
      env.ARK_PREVIEW_EXPECTED_REF!==EXPECTED_PREVIEW_REF){
    throw new Error("preview_canary_wrong_supabase_target");
  }
  const key=env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key||key.length<30)throw new Error("preview_canary_missing_service_role");
  const ownerId=env.ARK_PREVIEW_OWNER_ID??"";
  const projectId=env.ARK_PREVIEW_PROJECT_ID??"";
  const objectiveId=env.ARK_PREVIEW_OBJECTIVE_ID??"";
  const taskId=env.ARK_PREVIEW_TASK_ID??"";
  const validUuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  if(![ownerId,projectId,objectiveId,taskId].every(validUuid)){
    throw new Error("preview_canary_scoped_ids_required");
  }
  const db=createClient(EXPECTED_URL,key,{
    auth:{persistSession:false,autoRefreshToken:false},
  });
  const result=await runApprovedArkPreviewCanary({
    db,scope:{
      ownerId,projectId,objectiveId,taskId,
      workerId:"preview-canary:"+randomUUID(),
    },
  });
  // No owner, project, secret or private data printed to stdout.
  process.stdout.write(JSON.stringify(result)+"\n");
  if(!result.receiptVerified)process.exitCode=2;
}
void main().catch((error:unknown)=>{
  // Never print arbitrary Supabase error objects or secret-bearing stack.
  // Report only fixed, code-generated preflight errors. Never echo raw
  // Supabase errors, stack traces, keys, tokens, or arbitrary source text.
  const safe=error instanceof Error&&
    /^(?:preview_canary_|ark_preview_)[a-z_]+$/.test(error.message)
    ?error.message:"preview_canary_execution_or_readback_failed";
  process.stderr.write(safe+"\n");
  process.exitCode=1;
});

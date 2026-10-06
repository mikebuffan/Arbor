import type { SupabaseClient } from "@supabase/supabase-js";

export type PatternHopLease = {
  workerId: string;
  leaseToken: string;
  leaseMs: number;
};

type RpcResult = Record<string, unknown>;

export function isPatternHopRunControlEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.ARBOR_ENABLE_PATTERN_HOP_RUN_CONTROL === "true";
}

function record(value: unknown): RpcResult {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("pattern_hop_control_invalid_response");
  return value as RpcResult;
}

export async function claimPatternHopRun(input: {
  supabase: SupabaseClient;
  runId: string;
  userId: string;
  projectId: string;
  workerId: string;
  leaseMs?: number;
}): Promise<
  | {status:"claimed"; lease:PatternHopLease}
  | {status:"stopped"|"in_progress"}
> {
  const leaseMs=Math.min(120000,Math.max(5000,input.leaseMs ?? 90000));
  const {data,error}=await input.supabase.rpc("arbor_pattern_hop_claim_run",{
    p_run_id:input.runId,p_user_id:input.userId,p_project_id:input.projectId,
    p_worker_id:input.workerId,p_lease_ms:leaseMs,
  });
  if(error) throw error;
  const r=record(data);
  if(r.status==="claimed" && typeof r.leaseToken==="string")
    return {status:"claimed",lease:{workerId:input.workerId,leaseToken:r.leaseToken,leaseMs}};
  if(r.status==="stopped"||r.status==="in_progress") return {status:r.status};
  if(r.status==="not_found") throw new Error("pattern_hop_run_not_found");
  if(r.status==="no_access") throw new Error("pattern_hop_run_control_not_granted");
  throw new Error("pattern_hop_run_claim_invalid");
}

export async function heartbeatPatternHopRun(input:{
  supabase:SupabaseClient;runId:string;userId:string;projectId:string;lease:PatternHopLease;
}):Promise<"ok"|"stopped">{
  const {data,error}=await input.supabase.rpc("arbor_pattern_hop_heartbeat_run",{
    p_run_id:input.runId,p_user_id:input.userId,p_project_id:input.projectId,
    p_worker_id:input.lease.workerId,p_lease_token:input.lease.leaseToken,
    p_lease_ms:input.lease.leaseMs,
  });
  if(error) throw error;
  const r=record(data);
  if(r.status==="ok"||r.status==="stopped") return r.status;
  if(r.status==="stale") throw new Error("pattern_hop_run_lease_lost");
  if(r.status==="no_access") throw new Error("pattern_hop_run_control_not_granted");
  if(r.status==="not_found") throw new Error("pattern_hop_run_not_found");
  throw new Error("pattern_hop_run_heartbeat_invalid");
}

export async function releasePatternHopRun(input:{
  supabase:SupabaseClient;runId:string;userId:string;projectId:string;lease:PatternHopLease;
}):Promise<void>{
  const {data,error}=await input.supabase.rpc("arbor_pattern_hop_release_run",{
    p_run_id:input.runId,p_user_id:input.userId,p_project_id:input.projectId,
    p_worker_id:input.lease.workerId,p_lease_token:input.lease.leaseToken,
  });
  if(error) throw error;
  if(data==="released"||data==="stale"||data==="not_found") return;
  if(data==="no_access") throw new Error("pattern_hop_run_control_not_granted");
  throw new Error("pattern_hop_run_release_invalid");
}

export async function requestPatternHopStop(input:{
  supabase:SupabaseClient;runId:string;userId:string;projectId:string;
}):Promise<"requested"|"already_stopped">{
  const {data,error}=await input.supabase.rpc("arbor_pattern_hop_request_stop",{
    p_run_id:input.runId,p_user_id:input.userId,p_project_id:input.projectId,
  });
  if(error) throw error;
  if(data==="requested"||data==="already_stopped") return data;
  if(data==="not_found") throw new Error("pattern_hop_run_not_found");
  if(data==="no_access") throw new Error("pattern_hop_run_control_not_granted");
  throw new Error("pattern_hop_stop_invalid");
}

export async function resumePatternHopRun(input:{
  supabase:SupabaseClient;runId:string;userId:string;projectId:string;
}):Promise<"resumed"|"not_stopped">{
  const {data,error}=await input.supabase.rpc("arbor_pattern_hop_resume_run",{
    p_run_id:input.runId,p_user_id:input.userId,p_project_id:input.projectId,
  });
  if(error) throw error;
  if(data==="resumed"||data==="not_stopped") return data;
  if(data==="in_progress") throw new Error("pattern_hop_run_in_progress");
  if(data==="not_found") throw new Error("pattern_hop_run_not_found");
  if(data==="no_access") throw new Error("pattern_hop_run_control_not_granted");
  throw new Error("pattern_hop_resume_invalid");
}

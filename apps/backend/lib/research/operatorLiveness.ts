export type WorkerObservation={
  workerId:string;
  observedAtUtc:string;
  lastHeartbeatAtUtc:string|null;
  leaseExpiresAtUtc:string|null;
  claimedUnitId:string|null;
  declaredState:"idle"|"running"|"blocked"|"stopped"|"unknown";
};

export type WorkerLivenessReceipt={
  workerId:string;
  observedAtUtc:string;
  status:"active_lease"|"recent_heartbeat_no_active_lease"|"expired_or_stale"|"unknown";
  lastHeartbeatAtUtc:string|null;
  leaseExpiresAtUtc:string|null;
  claimedUnitId:string|null;
  source:"heartbeat_and_lease_only";
};

const req=(v:unknown,k:string,max=500):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_liveness_"+k);
  return v.trim();
};
const date=(v:string|null,k:string):string|null=>{
  if(v===null)return null;
  const x=req(v,k,100);
  if(!Number.isFinite(Date.parse(x)))throw new Error("invalid_liveness_"+k);
  return x;
};

export function observeWorkerLiveness(input:WorkerObservation,recentHeartbeatMs=120000):WorkerLivenessReceipt{
  const workerId=req(input.workerId,"worker_id");
  const observedAtUtc=date(input.observedAtUtc,"observed_at")!;
  const lastHeartbeatAtUtc=date(input.lastHeartbeatAtUtc,"heartbeat_at");
  const leaseExpiresAtUtc=date(input.leaseExpiresAtUtc,"lease_expires_at");
  const claimedUnitId=input.claimedUnitId===null?null:req(input.claimedUnitId,"unit_id",300);
  if(!["idle","running","blocked","stopped","unknown"].includes(input.declaredState))throw new Error("invalid_liveness_declared_state");
  if(!Number.isSafeInteger(recentHeartbeatMs)||recentHeartbeatMs<1000||recentHeartbeatMs>30*60*1000)
    throw new Error("invalid_liveness_recent_window");
  const observed=Date.parse(observedAtUtc);
  if(leaseExpiresAtUtc!==null&&Date.parse(leaseExpiresAtUtc)>observed&&claimedUnitId!==null){
    return {workerId,observedAtUtc,status:"active_lease",lastHeartbeatAtUtc,leaseExpiresAtUtc,claimedUnitId,
      source:"heartbeat_and_lease_only"};
  }
  if(lastHeartbeatAtUtc!==null){
    const age=observed-Date.parse(lastHeartbeatAtUtc);
    if(age>=0&&age<=recentHeartbeatMs)
      return {workerId,observedAtUtc,status:"recent_heartbeat_no_active_lease",lastHeartbeatAtUtc,leaseExpiresAtUtc,claimedUnitId,
        source:"heartbeat_and_lease_only"};
    return {workerId,observedAtUtc,status:"expired_or_stale",lastHeartbeatAtUtc,leaseExpiresAtUtc,claimedUnitId,
      source:"heartbeat_and_lease_only"};
  }
  return {workerId,observedAtUtc,status:"unknown",lastHeartbeatAtUtc:null,leaseExpiresAtUtc,claimedUnitId,
    source:"heartbeat_and_lease_only"};
}

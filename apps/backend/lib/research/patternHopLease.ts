export type PatternHopLease={runId:string;holder:string;leaseUntil:number;stopped:boolean;checkpoint:string|null};
export type LeaseDecision={allowed:boolean;reason:"acquired"|"same-holder"|"leased"|"stopped";lease:PatternHopLease};
export function acquirePatternHopLease(current:PatternHopLease,input:{runId:string;holder:string;now:number;ttlMs:number}):LeaseDecision{
 if(current.stopped)return{allowed:false,reason:"stopped",lease:current};
 if(current.runId===input.runId&&current.holder===input.holder&&current.leaseUntil>input.now)return{allowed:true,reason:"same-holder",lease:current};
 if(current.leaseUntil>input.now)return{allowed:false,reason:"leased",lease:current};
 return{allowed:true,reason:"acquired",lease:{...current,runId:input.runId,holder:input.holder,leaseUntil:input.now+input.ttlMs}};
}
export function stopPatternHop(current:PatternHopLease):PatternHopLease{return{...current,stopped:true,leaseUntil:0};}
export function checkpointPatternHop(current:PatternHopLease,checkpoint:string):PatternHopLease{
 if(current.stopped)throw new Error("pattern_hop_stopped");return{...current,checkpoint};
}

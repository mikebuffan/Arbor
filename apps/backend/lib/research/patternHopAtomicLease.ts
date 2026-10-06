export type AtomicLease={
 runId:string;
 holder:string|null;
 leaseUntil:number;
 version:number;
 stopped:boolean;
};
export type AtomicLeaseMutation={ok:boolean;reason:"acquired"|"renewed"|"released"|"stale-version"|"leased"|"stopped";next:AtomicLease};

export function acquireAtomicLease(current:AtomicLease,input:{holder:string;now:number;ttlMs:number;expectedVersion:number}):AtomicLeaseMutation{
 if(current.version!==input.expectedVersion)return{ok:false,reason:"stale-version",next:current};
 if(current.stopped)return{ok:false,reason:"stopped",next:current};
 if(current.holder===input.holder&&current.leaseUntil>input.now)
  return{ok:true,reason:"renewed",next:{...current,leaseUntil:input.now+input.ttlMs,version:current.version+1}};
 if(current.holder&&current.leaseUntil>input.now)return{ok:false,reason:"leased",next:current};
 return{ok:true,reason:"acquired",next:{...current,holder:input.holder,leaseUntil:input.now+input.ttlMs,version:current.version+1}};
}
export function releaseAtomicLease(current:AtomicLease,input:{holder:string;expectedVersion:number}):AtomicLeaseMutation{
 if(current.version!==input.expectedVersion)return{ok:false,reason:"stale-version",next:current};
 if(current.holder!==input.holder)return{ok:false,reason:"leased",next:current};
 return{ok:true,reason:"released",next:{...current,holder:null,leaseUntil:0,version:current.version+1}};
}

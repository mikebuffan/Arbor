export type ClaimConfidenceNode={claimId:string;baseConfidence:number;evidenceRefs:readonly string[]};
export type ClaimDependency={upstreamClaimId:string;downstreamClaimId:string;weight:number};
export type ClaimContradiction={claimId:string;severity:number;evidenceRefs:readonly string[]};
export type PropagatedClaimConfidence={
  claimId:string;baseConfidence:number;adjustedConfidence:number;directContradictionSeverity:number;
  propagatedFrom:readonly string[];evidenceRefs:readonly string[];status:"confidence_effect_not_verdict";
};
const req=(v:unknown,k:string)=>{if(typeof v!=="string"||!v.trim()||v.length>1000)throw Error("invalid_contradiction_"+k);return v.trim();};
const ratio=(v:number,k:string)=>{if(!Number.isFinite(v)||v<0||v>1)throw Error("invalid_contradiction_"+k);return v;};
const uniq=(v:readonly string[])=>[...new Set(v)].sort();

export function propagateContradictionEffects(nodes:readonly ClaimConfidenceNode[],deps:readonly ClaimDependency[],contradictions:readonly ClaimContradiction[]):readonly PropagatedClaimConfidence[]{
  const ns=nodes.map(n=>({...n,claimId:req(n.claimId,"claim_id"),baseConfidence:ratio(n.baseConfidence,"base_confidence"),
    evidenceRefs:uniq(n.evidenceRefs.map(x=>req(x,"evidence_ref")))}));
  if(new Set(ns.map(n=>n.claimId)).size!==ns.length)throw Error("duplicate_contradiction_claim_id");
  const known=new Set(ns.map(n=>n.claimId));
  const ds=deps.map(d=>{const u=req(d.upstreamClaimId,"upstream"),v=req(d.downstreamClaimId,"downstream");
    if(!known.has(u)||!known.has(v)||u===v)throw Error("invalid_contradiction_dependency");return{upstreamClaimId:u,downstreamClaimId:v,weight:ratio(d.weight,"dependency_weight")};});
  const cs=contradictions.map(c=>{const id=req(c.claimId,"claim_id");if(!known.has(id))throw Error("unknown_contradiction_claim");
    return{claimId:id,severity:ratio(c.severity,"severity"),evidenceRefs:uniq(c.evidenceRefs.map(x=>req(x,"evidence_ref")))}});

  const incoming=new Map(ns.map(n=>[n.claimId,0]));for(const d of ds)incoming.set(d.downstreamClaimId,(incoming.get(d.downstreamClaimId)??0)+1);
  const q=[...incoming.entries()].filter(([,n])=>n===0).map(([id])=>id).sort(),order:string[]=[];
  while(q.length){const id=q.shift()!;order.push(id);for(const d of ds.filter(x=>x.upstreamClaimId===id)){const n=(incoming.get(d.downstreamClaimId)??1)-1;incoming.set(d.downstreamClaimId,n);if(n===0){q.push(d.downstreamClaimId);q.sort();}}}
  if(order.length!==ns.length)throw Error("contradiction_dependency_cycle");

  const byId=new Map(ns.map(n=>[n.claimId,n]));
  const adjusted=new Map<string,number>(),from=new Map<string,string[]>(),extraRefs=new Map<string,string[]>();
  const directSeverity=new Map<string,number>();
  for(const c of cs){directSeverity.set(c.claimId,Math.max(directSeverity.get(c.claimId)??0,c.severity));
    extraRefs.set(c.claimId,[...(extraRefs.get(c.claimId)??[]),...c.evidenceRefs]);}
  for(const id of order){
    const n=byId.get(id)!;let value=n.baseConfidence*(1-(directSeverity.get(id)??0));
    const causes:string[]=[];
    for(const d of ds.filter(x=>x.downstreamClaimId===id)){
      const up=byId.get(d.upstreamClaimId)!;const upAdjusted=adjusted.get(d.upstreamClaimId)!;
      const weakening=up.baseConfidence===0?0:1-upAdjusted/up.baseConfidence;
      if(weakening>0){value*=1-d.weight*weakening;causes.push(d.upstreamClaimId);}
    }
    adjusted.set(id,Math.max(0,Math.min(1,value)));from.set(id,uniq(causes));
  }
  return ns.map(n=>({claimId:n.claimId,baseConfidence:n.baseConfidence,adjustedConfidence:adjusted.get(n.claimId)!,
    directContradictionSeverity:directSeverity.get(n.claimId)??0,propagatedFrom:from.get(n.claimId)??[],
    evidenceRefs:uniq([...n.evidenceRefs,...(extraRefs.get(n.claimId)??[])]),status:"confidence_effect_not_verdict" as const}));
}

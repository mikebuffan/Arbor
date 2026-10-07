export type IndependenceEvidence={
  evidenceRef:string;
  sourceId:string;
  sourceFamilyId:string;
  derivesFromEvidenceRefs:readonly string[];
};

export type IndependenceGroup={
  groupId:string;
  evidenceRefs:readonly string[];
  sourceIds:readonly string[];
  sourceFamilyIds:readonly string[];
  unresolvedDerivationRefs:readonly string[];
  status:"independence_candidate_not_verified";
};

export type IndependenceAssessment={
  independentGroups:readonly IndependenceGroup[];
  independentGroupCount:number;
  candidateGroupCount:number;
  unresolvedDerivationRefs:readonly string[];
  independenceReviewHold:boolean;
  status:"independence_not_truth";
};

const req=(v:unknown,k:string)=>{
  if(typeof v!=="string"||!v.trim()||v.length>1000)throw Error("invalid_independence_"+k);
  return v.trim();
};
const uniq=(v:readonly string[])=>[...new Set(v)].sort();

export function assessEvidenceIndependence(input:readonly IndependenceEvidence[]):IndependenceAssessment{
  const rows=input.map(r=>({
    evidenceRef:req(r.evidenceRef,"evidence_ref"),
    sourceId:req(r.sourceId,"source_id"),
    sourceFamilyId:req(r.sourceFamilyId,"source_family_id"),
    derivesFromEvidenceRefs:uniq(r.derivesFromEvidenceRefs.map(x=>req(x,"derivation_ref"))),
  }));
  if(new Set(rows.map(r=>r.evidenceRef)).size!==rows.length)
    throw Error("duplicate_independence_evidence_ref");

  const known=new Set(rows.map(r=>r.evidenceRef));
  for(const r of rows)if(r.derivesFromEvidenceRefs.includes(r.evidenceRef))
    throw Error("self_derivation_independence_evidence_ref");

  const parent=new Map(rows.map(r=>[r.evidenceRef,r.evidenceRef]));
  const find=(x:string):string=>{
    let p=parent.get(x)!;
    while(parent.get(p)!==p)p=parent.get(p)!;
    return p;
  };
  const union=(a:string,b:string)=>{
    const A=find(a),B=find(b);
    if(A!==B)parent.set(B,A);
  };

  const byFamily=new Map<string,string>();
  const bySource=new Map<string,string>();
  for(const r of rows){
    const familyPeer=byFamily.get(r.sourceFamilyId);
    if(familyPeer)union(r.evidenceRef,familyPeer);
    else byFamily.set(r.sourceFamilyId,r.evidenceRef);

    const sourcePeer=bySource.get(r.sourceId);
    if(sourcePeer)union(r.evidenceRef,sourcePeer);
    else bySource.set(r.sourceId,r.evidenceRef);

    for(const d of r.derivesFromEvidenceRefs)if(known.has(d))union(r.evidenceRef,d);
  }

  const groups=new Map<string,typeof rows>();
  for(const r of rows){
    const root=find(r.evidenceRef);
    groups.set(root,[...(groups.get(root)??[]),r]);
  }

  const independentGroups:IndependenceGroup[]=[...groups.values()].map(g=>{
    const unresolvedDerivationRefs=uniq(g.flatMap(x=>
      x.derivesFromEvidenceRefs.filter(d=>!known.has(d))));
    return {
      groupId:"independence:"+g.map(x=>x.evidenceRef).sort().join("|"),
      evidenceRefs:g.map(x=>x.evidenceRef).sort(),
      sourceIds:uniq(g.map(x=>x.sourceId)),
      sourceFamilyIds:uniq(g.map(x=>x.sourceFamilyId)),
      unresolvedDerivationRefs,
      status:"independence_candidate_not_verified" as const,
    };
  }).sort((a,b)=>a.groupId.localeCompare(b.groupId));

  const unresolvedDerivationRefs=uniq(independentGroups.flatMap(g=>g.unresolvedDerivationRefs));
  return {
    independentGroups,
    independentGroupCount:independentGroups.filter(g=>g.unresolvedDerivationRefs.length===0).length,
    candidateGroupCount:independentGroups.length,
    unresolvedDerivationRefs,
    independenceReviewHold:unresolvedDerivationRefs.length>0,
    status:"independence_not_truth",
  };
}

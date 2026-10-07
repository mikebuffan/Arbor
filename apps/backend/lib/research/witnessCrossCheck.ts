export type WitnessRecordKind="phone"|"calendar"|"travel"|"payment"|"message"|"witness"|"other";
export type WitnessClaim={claimId:string;witnessId:string;topicKey:string;evidenceRefs:readonly string[]};
export type WitnessCrossCheckRecord={
  recordId:string;claimId:string;kind:WitnessRecordKind;sourceFamilyId:string;evidenceRefs:readonly string[];
  relation:"supports"|"contradicts"|"contextualizes";independentOfWitnessSource:boolean;
};
export type WitnessClaimCheck={
  claimId:string;witnessId:string;topicKey:string;supportRefs:readonly string[];counterRefs:readonly string[];
  contextualRefs:readonly string[];independentSupportFamilies:readonly string[];independentCounterFamilies:readonly string[];
  checkedKinds:readonly WitnessRecordKind[];status:"cross_check_not_credibility_verdict";
};
const req=(v:unknown,k:string,max=1000)=>{if(typeof v!=="string"||!v.trim()||v.length>max)throw Error("invalid_witness_"+k);return v.trim();};
const uniq=(v:readonly string[])=>[...new Set(v)].sort();

export function crossCheckWitnessClaims(claims:readonly WitnessClaim[],records:readonly WitnessCrossCheckRecord[]):readonly WitnessClaimCheck[]{
  const cs=claims.map(c=>({...c,claimId:req(c.claimId,"claim_id"),witnessId:req(c.witnessId,"witness_id"),topicKey:req(c.topicKey,"topic_key"),
    evidenceRefs:uniq(c.evidenceRefs.map(x=>req(x,"evidence_ref")))}));
  if(new Set(cs.map(c=>c.claimId)).size!==cs.length)throw Error("duplicate_witness_claim_id");
  const known=new Set(cs.map(c=>c.claimId));
  const rs=records.map(r=>{
    if(!known.has(r.claimId))throw Error("unknown_witness_claim");
    return {...r,recordId:req(r.recordId,"record_id"),claimId:req(r.claimId,"claim_id"),sourceFamilyId:req(r.sourceFamilyId,"source_family_id"),
      evidenceRefs:uniq(r.evidenceRefs.map(x=>req(x,"evidence_ref")))};
  });
  if(new Set(rs.map(r=>r.recordId)).size!==rs.length)throw Error("duplicate_witness_record_id");
  return cs.map(c=>{
    const x=rs.filter(r=>r.claimId===c.claimId),pick=(d:WitnessCrossCheckRecord["relation"])=>x.filter(r=>r.relation===d);
    const s=pick("supports"),k=pick("contradicts"),ctx=pick("contextualizes");
    return {claimId:c.claimId,witnessId:c.witnessId,topicKey:c.topicKey,
      supportRefs:uniq(s.flatMap(r=>r.evidenceRefs)),counterRefs:uniq(k.flatMap(r=>r.evidenceRefs)),
      contextualRefs:uniq(ctx.flatMap(r=>r.evidenceRefs)),
      independentSupportFamilies:uniq(s.filter(r=>r.independentOfWitnessSource).map(r=>r.sourceFamilyId)),
      independentCounterFamilies:uniq(k.filter(r=>r.independentOfWitnessSource).map(r=>r.sourceFamilyId)),
      checkedKinds:uniq(x.map(r=>r.kind)) as WitnessRecordKind[],status:"cross_check_not_credibility_verdict" as const};
  });
}

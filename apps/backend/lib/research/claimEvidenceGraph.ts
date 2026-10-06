export type ClaimEvidenceEdge={claimId:string;evidenceRef:string;direction:"supports"|"contradicts"|"contextualizes";sourceFamilyId:string};
export type ClaimEvidenceSummary={claimId:string;supportRefs:readonly string[];counterRefs:readonly string[];contextRefs:readonly string[];supportFamilies:readonly string[];counterFamilies:readonly string[];status:"graph_not_verdict"};
const req=(v:unknown,k:string)=>{if(typeof v!=="string"||!v.trim()||v.length>1000)throw Error("invalid_claim_graph_"+k);return v.trim();};
export function summarizeClaimEvidence(edges:readonly ClaimEvidenceEdge[]):readonly ClaimEvidenceSummary[]{
 const rows=edges.map(e=>({...e,claimId:req(e.claimId,"claim_id"),evidenceRef:req(e.evidenceRef,"evidence_ref"),sourceFamilyId:req(e.sourceFamilyId,"source_family_id")}));
 const keys=new Set<string>();for(const r of rows){const k=[r.claimId,r.evidenceRef,r.direction].join("|");if(keys.has(k))throw Error("duplicate_claim_evidence_edge");keys.add(k);}
 const ids=[...new Set(rows.map(r=>r.claimId))].sort();return ids.map(claimId=>{const x=rows.filter(r=>r.claimId===claimId),pick=(d:ClaimEvidenceEdge["direction"])=>x.filter(r=>r.direction===d);
 const support=pick("supports"),counter=pick("contradicts"),context=pick("contextualizes");return {claimId,supportRefs:support.map(r=>r.evidenceRef).sort(),counterRefs:counter.map(r=>r.evidenceRef).sort(),contextRefs:context.map(r=>r.evidenceRef).sort(),supportFamilies:[...new Set(support.map(r=>r.sourceFamilyId))].sort(),counterFamilies:[...new Set(counter.map(r=>r.sourceFamilyId))].sort(),status:"graph_not_verdict"};});}

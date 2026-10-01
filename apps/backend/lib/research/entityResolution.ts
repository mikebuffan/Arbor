export type EntityKind = "person" | "organization" | "location" | "aircraft" | "account" | "other";
export type IdentityDecisionStatus = "resolved" | "candidate" | "ambiguous" | "rejected";

export type EntityCandidate = {
  candidateId: string;
  kind: EntityKind;
  canonicalLabel: string;
  aliases: readonly string[];
  supportingMentionIds: readonly string[];
};

export type IdentityDecision = {
  decisionId: string;
  candidateId: string;
  targetEntityId: string | null;
  status: IdentityDecisionStatus;
  basisMentionIds: readonly string[];
  decidedAtUtc: string;
  supersedesDecisionId: string | null;
  rationale: string;
};

const text=(v:unknown,k:string,max=400):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_"+k);
  return v.trim();
};
const unique=(values:readonly string[],field:string):string[]=>{
  if(!Array.isArray(values))throw new Error("invalid_"+field);
  const out=values.map(v=>text(v,field,240));
  if(new Set(out).size!==out.length)throw new Error("duplicate_"+field);
  return out;
};

export function normalizeAlias(value:string):string{
  return text(value,"alias").normalize("NFKC").toLowerCase()
    .replace(/[’']/g,"'").replace(/[^a-z0-9' -]+/g," ")
    .replace(/\s+/g," ").trim();
}

export function levenshteinDistance(a:string,b:string):number{
  const left=normalizeAlias(a),right=normalizeAlias(b);
  const row=Array.from({length:right.length+1},(_,i)=>i);
  for(let i=1;i<=left.length;i++){
    let prev=row[0];row[0]=i;
    for(let j=1;j<=right.length;j++){
      const temp=row[j];
      row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(left[i-1]===right[j-1]?0:1));
      prev=temp;
    }
  }
  return row[right.length];
}

export function aliasSimilarity(a:string,b:string):number{
  const left=normalizeAlias(a),right=normalizeAlias(b);
  if(left===right)return 1;
  const max=Math.max(left.length,right.length);
  return max===0?1:1-levenshteinDistance(left,right)/max;
}

export function createEntityCandidate(input:EntityCandidate):EntityCandidate{
  const candidateId=text(input.candidateId,"candidate_id");
  if(!["person","organization","location","aircraft","account","other"].includes(input.kind))
    throw new Error("invalid_entity_kind");
  const canonicalLabel=text(input.canonicalLabel,"canonical_label",240);
  const aliases=unique(input.aliases,"entity_alias");
  const supportingMentionIds=unique(input.supportingMentionIds,"supporting_mention_id");
  if(!supportingMentionIds.length)throw new Error("entity_candidate_requires_mention");
  return {candidateId,kind:input.kind,canonicalLabel,aliases,supportingMentionIds};
}

/** Candidate suggestions only. A high fuzzy score is never a merge decision. */
export function rankAliasCandidates(input:{
  observedLabel:string;
  candidates:readonly EntityCandidate[];
  threshold?:number;
}):readonly {candidateId:string;similarity:number;matchedAlias:string}[]{
  const threshold=input.threshold??0.72;
  if(!Number.isFinite(threshold)||threshold<0||threshold>1)throw new Error("invalid_alias_threshold");
  const observed=text(input.observedLabel,"observed_label",240);
  return input.candidates.flatMap(candidate=>{
    const labels=[candidate.canonicalLabel,...candidate.aliases];
    let best={similarity:-1,matchedAlias:""};
    for(const label of labels){
      const similarity=aliasSimilarity(observed,label);
      if(similarity>best.similarity)best={similarity,matchedAlias:label};
    }
    return best.similarity>=threshold?[{candidateId:candidate.candidateId,...best}]:[];
  }).sort((a,b)=>b.similarity-a.similarity||a.candidateId.localeCompare(b.candidateId));
}

export function createIdentityDecision(input:IdentityDecision):IdentityDecision{
  const decisionId=text(input.decisionId,"identity_decision_id");
  const candidateId=text(input.candidateId,"candidate_id");
  if(!["resolved","candidate","ambiguous","rejected"].includes(input.status))
    throw new Error("invalid_identity_status");
  const targetEntityId=input.targetEntityId===null?null:text(input.targetEntityId,"target_entity_id");
  if(input.status==="resolved"&&targetEntityId===null)throw new Error("resolved_identity_requires_target");
  if(input.status!=="resolved"&&targetEntityId!==null)throw new Error("unresolved_identity_cannot_target");
  const basisMentionIds=unique(input.basisMentionIds,"basis_mention_id");
  if(!basisMentionIds.length)throw new Error("identity_decision_requires_basis");
  const decidedAtUtc=text(input.decidedAtUtc,"decided_at_utc");
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(decidedAtUtc)||
     !Number.isFinite(Date.parse(decidedAtUtc))||new Date(decidedAtUtc).toISOString()!==decidedAtUtc)
    throw new Error("invalid_decided_at_utc");
  const supersedesDecisionId=input.supersedesDecisionId===null?null:text(input.supersedesDecisionId,"supersedes_decision_id");
  if(supersedesDecisionId===decisionId)throw new Error("identity_decision_cannot_supersede_self");
  const rationale=text(input.rationale,"identity_rationale",1000);
  return {decisionId,candidateId,targetEntityId,status:input.status,basisMentionIds,
    decidedAtUtc,supersedesDecisionId,rationale};
}

/** Produces an immutable correction chain. Original mentions/candidates are not
 * mutated or deleted when an identity decision is corrected.
 */
export function currentIdentityDecision(decisions:readonly IdentityDecision[],candidateId:string):IdentityDecision|null{
  const id=text(candidateId,"candidate_id");
  const relevant=decisions.filter(d=>d.candidateId===id);
  if(!relevant.length)return null;
  const superseded=new Set(relevant.map(d=>d.supersedesDecisionId).filter((v):v is string=>v!==null));
  const heads=relevant.filter(d=>!superseded.has(d.decisionId));
  if(heads.length!==1)throw new Error("invalid_identity_decision_chain");
  return heads[0];
}

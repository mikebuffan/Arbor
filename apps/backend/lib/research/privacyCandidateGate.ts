export type PrivacyCandidateKind="email"|"phone"|"street_address"|"account_identifier"|"passport_or_document"|"other_identifier";
export type PrivacyCandidate={
  candidateId:string;
  kind:PrivacyCandidateKind;
  literalValue:string;
  sourceRefs:readonly string[];
  relatedEntityCandidateIds:readonly string[];
  status:"hold_for_human_privacy_classification";
};

export type HumanPrivacyDecisionType=
  | "allow_public_record_identifier"
  | "withhold_private_identifier"
  | "escalate_sensitive_subject"
  | "not_pii";

export type HumanPrivacyDecision={
  decisionId:string;
  candidateId:string;
  decision:HumanPrivacyDecisionType;
  reviewerRef:string;
  rationale:string;
  basisEvidenceRefs:readonly string[];
  decidedAtUtc:string;
  status:"human_privacy_decision";
};

const req=(v:unknown,k:string,max=4000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_privacy_"+k);
  return v.trim();
};
const uniq=(v:readonly string[],k:string)=>[...new Set(v.map(x=>req(x,k,1000)))].sort();

export function createPrivacyCandidate(input:PrivacyCandidate):PrivacyCandidate{
  const candidateId=req(input.candidateId,"candidate_id",300);
  if(!["email","phone","street_address","account_identifier","passport_or_document","other_identifier"].includes(input.kind))
    throw new Error("invalid_privacy_kind");
  const literalValue=req(input.literalValue,"literal_value",2000);
  const sourceRefs=uniq(input.sourceRefs,"source_ref");
  if(!sourceRefs.length)throw new Error("privacy_source_ref_required");
  return {candidateId,kind:input.kind,literalValue,sourceRefs,
    relatedEntityCandidateIds:uniq(input.relatedEntityCandidateIds,"entity_candidate_id"),
    status:"hold_for_human_privacy_classification"};
}

/**
 * This gate never labels someone a victim, private person, public official, or
 * wrongdoer automatically. Classification/release disposition is a human receipt.
 */
export function recordHumanPrivacyDecision(input:HumanPrivacyDecision):HumanPrivacyDecision{
  const decisionId=req(input.decisionId,"decision_id",300);
  const candidateId=req(input.candidateId,"candidate_id",300);
  if(!["allow_public_record_identifier","withhold_private_identifier","escalate_sensitive_subject","not_pii"].includes(input.decision))
    throw new Error("invalid_privacy_decision");
  const reviewerRef=req(input.reviewerRef,"reviewer_ref",300);
  const rationale=req(input.rationale,"rationale",4000);
  const basisEvidenceRefs=uniq(input.basisEvidenceRefs,"basis_evidence_ref");
  if(!basisEvidenceRefs.length)throw new Error("privacy_decision_evidence_required");
  const decidedAtUtc=req(input.decidedAtUtc,"decided_at",100);
  if(!Number.isFinite(Date.parse(decidedAtUtc)))throw new Error("invalid_privacy_decided_at");
  return {decisionId,candidateId,decision:input.decision,reviewerRef,rationale,basisEvidenceRefs,decidedAtUtc,
    status:"human_privacy_decision"};
}

export function privacyReleaseDisposition(candidate:PrivacyCandidate,decision:HumanPrivacyDecision|null):{
  release:"hold"|"allow_identifier"|"withhold_identifier";
  reason:string;
}{
  createPrivacyCandidate(candidate);
  if(!decision)return {release:"hold",reason:"human_privacy_decision_missing"};
  const d=recordHumanPrivacyDecision(decision);
  if(d.candidateId!==candidate.candidateId)return {release:"hold",reason:"privacy_decision_candidate_mismatch"};
  if(d.decision==="allow_public_record_identifier"||d.decision==="not_pii")
    return {release:"allow_identifier",reason:d.decision};
  if(d.decision==="withhold_private_identifier")
    return {release:"withhold_identifier",reason:d.decision};
  return {release:"hold",reason:"sensitive_subject_escalation"};
}

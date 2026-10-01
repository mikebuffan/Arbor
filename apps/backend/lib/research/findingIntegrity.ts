export type EvidenceStatus="direct"|"corroborated"|"single_source"|"inferred";
export type IdentityStatus="resolved"|"candidate"|"ambiguous"|"rejected";
export type ConnectionType="documented"|"temporal"|"spatial"|"transactional"|"linguistic_proximity";

export type FindingDependency={
  evidenceRef:string;
  role:"support"|"counterevidence"|"context";
};
export type FindingVersion={
  findingId:string;
  version:number;
  statement:string;
  evidenceStatus:EvidenceStatus;
  identityStatus:IdentityStatus;
  connectionTypes:readonly ConnectionType[];
  dependencies:readonly FindingDependency[];
  unresolvedWeaknesses:readonly string[];
  reviewStatus:"hold_for_human_review";
  supersedesVersion:number|null;
};
export type EvidenceChange={
  evidenceRef:string;
  changeType:"corrected"|"superseded"|"reclassified_duplicate"|"retracted"|"identity_changed";
  reason:string;
};
export type ReplayImpact={
  findingId:string;
  version:number;
  changedEvidenceRefs:readonly string[];
  action:"re_review_required";
};

const t=(v:unknown,k:string,max=2000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_"+k);
  return v.trim();
};
const uniq=(v:readonly string[],k:string)=>[...new Set(v.map(x=>t(x,k)))];

export function createFindingVersion(input:FindingVersion):FindingVersion{
  const findingId=t(input.findingId,"finding_id");
  if(!Number.isSafeInteger(input.version)||input.version<1)throw new Error("invalid_finding_version");
  if(input.version===1&&input.supersedesVersion!==null)throw new Error("first_finding_cannot_supersede");
  if(input.version>1&&input.supersedesVersion!==input.version-1)throw new Error("finding_version_must_be_sequential");
  const statement=t(input.statement,"finding_statement",8000);
  if(!["direct","corroborated","single_source","inferred"].includes(input.evidenceStatus))throw new Error("invalid_evidence_status");
  if(!["resolved","candidate","ambiguous","rejected"].includes(input.identityStatus))throw new Error("invalid_identity_status");
  const connectionTypes=[...new Set(input.connectionTypes)];
  for(const type of connectionTypes)if(!["documented","temporal","spatial","transactional","linguistic_proximity"].includes(type))throw new Error("invalid_connection_type");
  if(!Array.isArray(input.dependencies)||!input.dependencies.length)throw new Error("finding_requires_dependency");
  const dependencies=input.dependencies.map(dep=>({
    evidenceRef:t(dep.evidenceRef,"finding_evidence_ref"),
    role:(["support","counterevidence","context"].includes(dep.role)?dep.role:(()=>{throw new Error("invalid_dependency_role")})()) as FindingDependency["role"],
  }));
  const unresolvedWeaknesses=uniq(input.unresolvedWeaknesses,"unresolved_weakness");
  return {findingId,version:input.version,statement,evidenceStatus:input.evidenceStatus,
    identityStatus:input.identityStatus,connectionTypes,dependencies,unresolvedWeaknesses,
    reviewStatus:"hold_for_human_review",supersedesVersion:input.supersedesVersion};
}

export function downstreamEvidenceReplay(
  findings:readonly FindingVersion[],
  changesInput:readonly EvidenceChange[],
):readonly ReplayImpact[]{
  const changes=changesInput.map(change=>({
    evidenceRef:t(change.evidenceRef,"changed_evidence_ref"),
    changeType:change.changeType,
    reason:t(change.reason,"evidence_change_reason"),
  }));
  const changed=new Set(changes.map(c=>c.evidenceRef));
  return findings.flatMap(finding=>{
    const refs=[...new Set(finding.dependencies.map(d=>d.evidenceRef).filter(ref=>changed.has(ref)))];
    return refs.length?[{findingId:finding.findingId,version:finding.version,changedEvidenceRefs:refs,action:"re_review_required" as const}]:[];
  });
}

export type AdversarialReviewInput={
  finding:FindingVersion;
  independentSourceFamilyCount:number;
  counterevidenceRefs:readonly string[];
  alternativeExplanations:readonly string[];
  chronologyConflictIds:readonly string[];
  unresolvedIdentityIds:readonly string[];
};
export type AdversarialReviewResult={
  findingId:string;
  status:"hold"|"eligible_for_human_promotion_review";
  failures:readonly string[];
  counterevidenceRefs:readonly string[];
  alternativeExplanations:readonly string[];
};
/** This never promotes a finding itself. It only decides whether minimum
 * adversarial checks are present before a human promotion review.
 */
export function adversarialFindingCheck(input:AdversarialReviewInput):AdversarialReviewResult{
  const finding=createFindingVersion(input.finding);
  if(!Number.isSafeInteger(input.independentSourceFamilyCount)||input.independentSourceFamilyCount<0)
    throw new Error("invalid_independent_source_family_count");
  const counter=uniq(input.counterevidenceRefs,"counterevidence_ref");
  const alternatives=uniq(input.alternativeExplanations,"alternative_explanation");
  const conflicts=uniq(input.chronologyConflictIds,"chronology_conflict_id");
  const identities=uniq(input.unresolvedIdentityIds,"unresolved_identity_id");
  const failures:string[]=[];
  if(finding.evidenceStatus==="corroborated"&&input.independentSourceFamilyCount<2)failures.push("corroboration_not_independent");
  if(finding.identityStatus!=="resolved")failures.push("identity_not_resolved");
  if(conflicts.length)failures.push("chronology_conflicts_unresolved");
  if(identities.length)failures.push("identity_conflicts_unresolved");
  if(!alternatives.length)failures.push("alternative_explanations_not_recorded");
  if(!counter.length)failures.push("counterevidence_search_not_recorded");
  if(finding.unresolvedWeaknesses.length)failures.push("finding_has_unresolved_weaknesses");
  return {findingId:finding.findingId,status:failures.length?"hold":"eligible_for_human_promotion_review",
    failures,counterevidenceRefs:counter,alternativeExplanations:alternatives};
}

export type RoundaboutDirective={
  directiveId:string;
  anomalyRef:string;
  query:string;
  expectedEvidenceType:string;
  maxDepth:number;
  maxHopsPerAttempt:number;
  stoppingCondition:string;
  triggerEvidenceRefs:readonly string[];
};
export function createRoundaboutDirective(input:RoundaboutDirective):RoundaboutDirective{
  const directiveId=t(input.directiveId,"directive_id"),anomalyRef=t(input.anomalyRef,"anomaly_ref"),
    query=t(input.query,"directive_query",3000),expectedEvidenceType=t(input.expectedEvidenceType,"expected_evidence_type"),
    stoppingCondition=t(input.stoppingCondition,"stopping_condition",2000);
  if(!Number.isSafeInteger(input.maxDepth)||input.maxDepth<1||input.maxDepth>5)throw new Error("invalid_max_depth");
  if(!Number.isSafeInteger(input.maxHopsPerAttempt)||input.maxHopsPerAttempt<1||input.maxHopsPerAttempt>10)
    throw new Error("invalid_max_hops_per_attempt");
  const refs=uniq(input.triggerEvidenceRefs,"trigger_evidence_ref");
  if(!refs.length)throw new Error("directive_requires_trigger_evidence");
  return {directiveId,anomalyRef,query,expectedEvidenceType,maxDepth:input.maxDepth,maxHopsPerAttempt:input.maxHopsPerAttempt,
    stoppingCondition,triggerEvidenceRefs:refs};
}

export type ResearchInterrupt={
  interruptId:string;
  parentCheckpointRef:string;
  anomalyRef:string;
  directive:RoundaboutDirective;
  status:"queued";
};
export function queueResearchInterrupt(input:ResearchInterrupt):ResearchInterrupt{
  return {interruptId:t(input.interruptId,"interrupt_id"),parentCheckpointRef:t(input.parentCheckpointRef,"parent_checkpoint_ref"),
    anomalyRef:t(input.anomalyRef,"anomaly_ref"),directive:createRoundaboutDirective(input.directive),status:"queued"};
}

export type PublicationPreflight={
  findingId:string;
  unresolvedPrivacyFlagIds:readonly string[];
  originalPageReviewComplete:boolean;
  releaseAuthorized:boolean;
};
export function publicationPreflight(input:PublicationPreflight):{
  findingId:string;status:"hold"|"authorized_for_export";reasons:readonly string[];
}{
  const findingId=t(input.findingId,"finding_id");
  const flags=uniq(input.unresolvedPrivacyFlagIds,"privacy_flag_id"),reasons:string[]=[];
  if(flags.length)reasons.push("unresolved_privacy_flags");
  if(input.originalPageReviewComplete!==true)reasons.push("original_page_review_incomplete");
  if(input.releaseAuthorized!==true)reasons.push("release_not_authorized");
  return {findingId,status:reasons.length?"hold":"authorized_for_export",reasons};
}

export type InvestigationCockpitInput={
  totalPages:number;uniquePages:number;duplicatePages:number;unresolvedIdentityCount:number;
  contradictionCount:number;missingSourceLeadCount:number;activeRoundaboutCount:number;
  unprocessedFamilyCount:number;findingsAwaitingReview:number;
};
export function investigationCockpit(input:InvestigationCockpitInput){
  for(const [key,value] of Object.entries(input))if(!Number.isSafeInteger(value)||value<0)throw new Error("invalid_cockpit_"+key);
  if(input.uniquePages+input.duplicatePages>input.totalPages)throw new Error("invalid_cockpit_page_counts");
  return {...input,coverage:{
    uniqueRatio:input.totalPages?input.uniquePages/input.totalPages:0,
    processedSignal:input.totalPages?1-input.unprocessedFamilyCount/Math.max(1,input.totalPages):0,
  }};
}

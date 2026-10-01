export type ResearchStoppingInput={
  sourceFamiliesExhausted:boolean;
  unresolvedContradictionCount:number;
  unresolvedIdentityCount:number;
  unresolvedRequiredWork:number;
  coverageRatios:readonly number[];
  roundsWithoutNewEvidence:number;
  roundsWithoutNewLeads:number;
  minimumStableRounds:number;
  completionEvidenceRefs:readonly string[];
};

export type ResearchStoppingDecision={
  action:"continue"|"hold_for_manual_review"|"stop_exhausted";
  reasons:readonly string[];
};

export function decideCoverageAwareStopping(input:ResearchStoppingInput):ResearchStoppingDecision{
  for(const [v,k] of [
    [input.unresolvedContradictionCount,"contradictions"],
    [input.unresolvedIdentityCount,"identities"],
    [input.unresolvedRequiredWork,"required_work"],
    [input.roundsWithoutNewEvidence,"no_evidence_rounds"],
    [input.roundsWithoutNewLeads,"no_lead_rounds"],
    [input.minimumStableRounds,"minimum_stable_rounds"],
  ] as const){
    if(!Number.isSafeInteger(v)||v<0)throw new Error("invalid_stopping_"+k);
  }
  if(input.minimumStableRounds<1)throw new Error("invalid_stopping_minimum_stable_rounds");
  if(!Array.isArray(input.coverageRatios)||input.coverageRatios.length===0)throw new Error("stopping_coverage_required");
  if(input.coverageRatios.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error("invalid_stopping_coverage");
  const refs=[...new Set(input.completionEvidenceRefs.map(ref=>{
    if(typeof ref!=="string"||!ref.trim())throw new Error("invalid_stopping_evidence_ref");
    return ref.trim();
  }))];

  const reasons:string[]=[];
  if(input.unresolvedRequiredWork>0)reasons.push("required_work_remaining");
  if(input.unresolvedContradictionCount>0)reasons.push("contradictions_unresolved");
  if(input.unresolvedIdentityCount>0)reasons.push("identities_unresolved");
  if(!input.sourceFamiliesExhausted)reasons.push("source_families_not_exhausted");
  if(Math.min(...input.coverageRatios)<.75)reasons.push("coverage_below_stop_threshold");
  if(input.roundsWithoutNewEvidence<input.minimumStableRounds)reasons.push("evidence_search_not_stable");
  if(input.roundsWithoutNewLeads<input.minimumStableRounds)reasons.push("lead_search_not_stable");

  if(input.unresolvedContradictionCount>0||input.unresolvedIdentityCount>0)
    return {action:"hold_for_manual_review",reasons};

  if(reasons.length>0)return {action:"continue",reasons};

  if(refs.length===0)return {action:"hold_for_manual_review",reasons:["no_completion_evidence_receipts"]};

  return {action:"stop_exhausted",reasons:[
    "bounded_source_families_exhausted",
    "coverage_threshold_met",
    "stable_no-new-evidence_rounds",
    "stable_no-new-lead_rounds",
    "completion_evidence_present",
  ]};
}

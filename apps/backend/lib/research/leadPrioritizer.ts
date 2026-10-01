export type ResearchLeadInput={
  leadId:string;
  triggerEvidenceRefs:readonly string[];
  contradictionCount:number;
  independentSourcePotential:number;
  unresolvedIdentityCount:number;
  missingConnectivityCount:number;
  expectedInformationGain:number;
  evidenceDensity:number;
  estimatedCostUnits:number;
};

export type PrioritizedResearchLead={
  leadId:string;
  score:number;
  normalizedCost:number;
  reasons:readonly string[];
  triggerEvidenceRefs:readonly string[];
  status:"research_value_only";
};

const req=(v:unknown,k:string,max=500):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_lead_"+k);
  return v.trim();
};
const n=(v:number,k:string,max:number):number=>{
  if(!Number.isFinite(v)||v<0||v>max)throw new Error("invalid_lead_"+k);
  return v;
};
const ratio=(v:number,k:string)=>n(v,k,1);

export function prioritizeResearchLeads(input:readonly ResearchLeadInput[]):readonly PrioritizedResearchLead[]{
  const rows=input.map(lead=>{
    const leadId=req(lead.leadId,"id");
    const refs=[...new Set(lead.triggerEvidenceRefs.map(x=>req(x,"evidence_ref",800)))].sort();
    if(!refs.length)throw new Error("lead_evidence_ref_required");
    const contradictionCount=n(lead.contradictionCount,"contradiction_count",10000);
    const independentSourcePotential=ratio(lead.independentSourcePotential,"independent_source_potential");
    const unresolvedIdentityCount=n(lead.unresolvedIdentityCount,"unresolved_identity_count",10000);
    const missingConnectivityCount=n(lead.missingConnectivityCount,"missing_connectivity_count",10000);
    const expectedInformationGain=ratio(lead.expectedInformationGain,"expected_information_gain");
    const evidenceDensity=ratio(lead.evidenceDensity,"evidence_density");
    const estimatedCostUnits=n(lead.estimatedCostUnits,"estimated_cost_units",100000);
    const normalizedCost=estimatedCostUnits/(estimatedCostUnits+10);

    const contradictionSignal=Math.min(1,Math.log1p(contradictionCount)/Math.log(11));
    const identitySignal=Math.min(1,Math.log1p(unresolvedIdentityCount)/Math.log(11));
    const connectivitySignal=Math.min(1,Math.log1p(missingConnectivityCount)/Math.log(11));
    const value=.20*contradictionSignal+.18*independentSourcePotential+.15*identitySignal+
      .15*connectivitySignal+.20*expectedInformationGain+.12*evidenceDensity;
    const score=Math.max(0,Math.min(1,value*(1-.45*normalizedCost)));

    const reasons:string[]=[];
    if(contradictionSignal>=.4)reasons.push("contradiction_density");
    if(independentSourcePotential>=.5)reasons.push("independent_source_potential");
    if(identitySignal>=.4)reasons.push("unresolved_identity");
    if(connectivitySignal>=.4)reasons.push("missing_connective_tissue");
    if(expectedInformationGain>=.5)reasons.push("expected_information_gain");
    if(evidenceDensity>=.5)reasons.push("evidence_density");
    if(normalizedCost>=.7)reasons.push("high_estimated_cost_penalty");

    return {leadId,score,normalizedCost,reasons,triggerEvidenceRefs:refs,
      status:"research_value_only" as const};
  });
  if(new Set(rows.map(r=>r.leadId)).size!==rows.length)throw new Error("duplicate_lead_id");
  return rows.sort((a,b)=>b.score-a.score||a.leadId.localeCompare(b.leadId));
}

/** Guardrail: person-level suspicion or guilt fields are intentionally not accepted by this API. */
export function leadPrioritizerAcceptedFields():readonly string[]{
  return ["contradictionCount","independentSourcePotential","unresolvedIdentityCount",
    "missingConnectivityCount","expectedInformationGain","evidenceDensity","estimatedCostUnits"];
}

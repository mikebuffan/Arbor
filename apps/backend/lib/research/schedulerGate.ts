export type ResearchSchedulerState={
  schedulerId:string;
  enabled:false;
  cadence:null;
  executionTarget:null;
  authorizationRef:null;
  status:"disabled_explicit_authorization_required";
};

export function createDefaultOffResearchScheduler(schedulerId:string):ResearchSchedulerState{
  if(typeof schedulerId!=="string"||!schedulerId.trim()||schedulerId.length>300)
    throw new Error("invalid_research_scheduler_id");
  return {schedulerId:schedulerId.trim(),enabled:false,cadence:null,executionTarget:null,authorizationRef:null,
    status:"disabled_explicit_authorization_required"};
}

export type ResearchSchedulerActivationRequest={
  schedulerId:string;
  explicitAuthorizationRef:string|null;
  integrationExecutionEnabled:boolean;
  realSourceIngestionEnabled:boolean;
};

export function evaluateResearchSchedulerActivation(input:ResearchSchedulerActivationRequest):{
  allowed:false;
  reasons:readonly string[];
}{
  const reasons:string[]=[];
  if(!input.explicitAuthorizationRef)reasons.push("explicit_scheduler_authorization_missing");
  if(!input.integrationExecutionEnabled)reasons.push("integration_execution_disabled");
  if(!input.realSourceIngestionEnabled)reasons.push("real_source_ingestion_disabled");
  if(!reasons.length)reasons.push("v7_scheduler_activation_not_implemented");
  return {allowed:false,reasons};
}

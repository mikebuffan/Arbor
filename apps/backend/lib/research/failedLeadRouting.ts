export type LeadOutcome="open"|"failed"|"contradicted"|"insufficient"|"resolved";
export type LeadRoute={leadId:string;outcome:LeadOutcome;depth:number;branchCount:number;triggerEvidenceRefs:readonly string[];alternateQueries:readonly string[]};
export type RerouteDirective={leadId:string;status:"stop"|"reroute";queries:readonly string[];reason:string};
const req=(v:unknown,k:string)=>{if(typeof v!=="string"||!v.trim()||v.length>2000)throw Error("invalid_lead_route_"+k);return v.trim();};
export function routeFailedLead(input:LeadRoute,limits={maxDepth:5,maxBranches:4}):RerouteDirective{
 const leadId=req(input.leadId,"lead_id");if(!Number.isSafeInteger(input.depth)||input.depth<0||!Number.isSafeInteger(input.branchCount)||input.branchCount<0)throw Error("invalid_lead_route_bounds");
 const refs=[...new Set(input.triggerEvidenceRefs.map(x=>req(x,"evidence_ref")))];if(!refs.length)throw Error("lead_route_evidence_required");
 if(input.outcome==="resolved"||input.outcome==="open")return{leadId,status:"stop",queries:[],reason:"lead_not_failed"};
 if(input.depth>=limits.maxDepth||input.branchCount>=limits.maxBranches)return{leadId,status:"stop",queries:[],reason:"bounded_branch_limit"};
 const queries=[...new Set(input.alternateQueries.map(x=>req(x,"alternate_query")))];if(!queries.length)return{leadId,status:"stop",queries:[],reason:"no_evidence_bound_alternate"};
 return{leadId,status:"reroute",queries:queries.slice(0,Math.max(0,limits.maxBranches-input.branchCount)),reason:"failed_lead_evidence_bound_reroute"};
}

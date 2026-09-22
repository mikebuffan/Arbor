import type { CogChallenge, CogEvidence, CogPacket } from "./types.js";

export type LongitudinalEvidenceRef = { sourceId:string; occurredAt:string; kind:string; excerpt?:string; confidence:number };
export type LongitudinalObservationInput = {
  id:string; scope:string; subjectKey:string; attributeKey:string; value:unknown; polarity:1|-1; observedAt:string; confidence:number;
  evidence:LongitudinalEvidenceRef[]; isInference:boolean; inferenceMethod?:string; supersedesObservationId?:string; correctedByObservationId?:string; tags:string[];
};

/** Bridge the recovered longitudinal schema into Cog without resolving history at the boundary. */
export function longitudinalObservationsToPacket(observations:LongitudinalObservationInput[], id="longitudinal-export"):CogPacket {
  const evidence:CogEvidence[]=[]; const challenges:CogChallenge[]=[]; const provenance=new Set<string>(); const unresolved:string[]=[];
  for(const o of observations){
    for(const ref of o.evidence) provenance.add(ref.sourceId);
    evidence.push({id:o.id,value:{scope:o.scope,subjectKey:o.subjectKey,attributeKey:o.attributeKey,value:o.value,polarity:o.polarity,observedAt:o.observedAt,isInference:o.isInference,inferenceMethod:o.inferenceMethod,tags:o.tags,supersedesObservationId:o.supersedesObservationId,correctedByObservationId:o.correctedByObservationId},provenance:o.evidence.map(e=>e.sourceId),confidence:o.confidence});
    if(!o.evidence.length) unresolved.push(`missing-evidence:${o.id}`);
    if(o.isInference) unresolved.push(`inference:${o.id}`);
    if(o.correctedByObservationId) challenges.push({id:`correction:${o.id}`,source:o.correctedByObservationId,target:o.id,reason:"historical observation has an explicit correction",provenance:o.evidence.map(e=>e.sourceId),resolved:false});
  }
  return {id,evidence,hypotheses:[],unresolved:[...new Set(unresolved)],challenges,provenance:[...provenance],friction:0,circulation:0,metadata:{sourceKind:"longitudinal-export",observationCount:observations.length}};
}

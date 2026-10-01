export type InvestigationEdgeType =
  | "person_person" | "person_location" | "person_organization"
  | "person_flight" | "person_account_or_payment" | "person_communication"
  | "document_document" | "source_source" | "proximity";

export type InvestigationEdge = {
  edgeId:string;
  leftEntityId:string;
  rightEntityId:string;
  type:InvestigationEdgeType;
  evidenceRefs:readonly string[];
  sourceFamilyIds:readonly string[];
  firstObservedAtUtc:string|null;
  lastObservedAtUtc:string|null;
};

export type CogMetric = {
  entityId:string;
  degree:number;
  edgeTypeDiversity:number;
  sourceFamilyDiversity:number;
  evidenceDiversity:number;
  temporalSpanDays:number|null;
};

const tx=(v:unknown,k:string,max=400):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_"+k);
  return v.trim();
};
const uniq=(v:readonly string[],k:string)=>[...new Set(v.map(x=>tx(x,k)))].sort();

export function validateInvestigationEdge(edge:InvestigationEdge):InvestigationEdge{
  const edgeId=tx(edge.edgeId,"edge_id");
  const leftEntityId=tx(edge.leftEntityId,"left_entity_id"),rightEntityId=tx(edge.rightEntityId,"right_entity_id");
  if(leftEntityId===rightEntityId)throw new Error("self_edge_not_allowed");
  if(!["person_person","person_location","person_organization","person_flight","person_account_or_payment","person_communication","document_document","source_source","proximity"].includes(edge.type))
    throw new Error("invalid_edge_type");
  const evidenceRefs=uniq(edge.evidenceRefs,"edge_evidence_ref");
  if(!evidenceRefs.length)throw new Error("edge_requires_evidence");
  const sourceFamilyIds=uniq(edge.sourceFamilyIds,"source_family_id");
  const first=edge.firstObservedAtUtc,last=edge.lastObservedAtUtc;
  for(const [value,name] of [[first,"first_observed_at"],[last,"last_observed_at"]] as const){
    if(value!==null&&!Number.isFinite(Date.parse(value)))throw new Error("invalid_"+name);
  }
  if(first!==null&&last!==null&&Date.parse(last)<Date.parse(first))throw new Error("invalid_edge_time_range");
  return {...edge,edgeId,leftEntityId,rightEntityId,evidenceRefs,sourceFamilyIds,firstObservedAtUtc:first,lastObservedAtUtc:last};
}

export function computeCogMetrics(edgesInput:readonly InvestigationEdge[]):readonly CogMetric[]{
  const edges=edgesInput.map(validateInvestigationEdge);
  const nodes=new Set(edges.flatMap(e=>[e.leftEntityId,e.rightEntityId]));
  return [...nodes].map(entityId=>{
    const connected=edges.filter(e=>e.leftEntityId===entityId||e.rightEntityId===entityId);
    const types=new Set(connected.map(e=>e.type));
    const families=new Set(connected.flatMap(e=>e.sourceFamilyIds));
    const evidence=new Set(connected.flatMap(e=>e.evidenceRefs));
    const times=connected.flatMap(e=>[e.firstObservedAtUtc,e.lastObservedAtUtc])
      .filter((v):v is string=>v!==null).map(Date.parse).filter(Number.isFinite);
    const temporalSpanDays=times.length>1?(Math.max(...times)-Math.min(...times))/86400000:null;
    return {entityId,degree:connected.length,edgeTypeDiversity:types.size,
      sourceFamilyDiversity:families.size,evidenceDiversity:evidence.size,temporalSpanDays};
  }).sort((a,b)=>b.degree-a.degree||b.sourceFamilyDiversity-a.sourceFamilyDiversity||
    b.edgeTypeDiversity-a.edgeTypeDiversity||a.entityId.localeCompare(b.entityId));
}

export type SourceOriginNode={
  sourceId:string;
  derivesFromSourceIds:readonly string[];
  contentHash:string|null;
};
export type SourceOriginFamily={
  familyId:string;
  sourceIds:readonly string[];
  basis:readonly string[];
};

/** Groups sources conservatively when they share bytes or explicit derivation.
 * Merely having different URLs never makes sources independent.
 */
export function buildSourceOriginFamilies(nodesInput:readonly SourceOriginNode[]):readonly SourceOriginFamily[]{
  const nodes=nodesInput.map(node=>({
    sourceId:tx(node.sourceId,"source_id"),
    derivesFromSourceIds:uniq(node.derivesFromSourceIds,"derives_from_source_id"),
    contentHash:node.contentHash===null?null:tx(node.contentHash,"content_hash").toLowerCase(),
  }));
  if(new Set(nodes.map(n=>n.sourceId)).size!==nodes.length)throw new Error("duplicate_source_id");
  const parent=new Map(nodes.map(n=>[n.sourceId,n.sourceId]));
  const find=(id:string):string=>{
    let p=parent.get(id)!;
    while(parent.get(p)!==p)p=parent.get(p)!;
    let x=id;
    while(parent.get(x)!==p){
      const q=parent.get(x)!;
      parent.set(x,p);
      x=q;
    }
    return p;
  };
  const union=(a:string,b:string)=>{const A=find(a),B=find(b);if(A!==B)parent.set(B,A);};
  const byHash=new Map<string,string>();
  for(const node of nodes){
    if(node.contentHash){const prior=byHash.get(node.contentHash);if(prior)union(node.sourceId,prior);else byHash.set(node.contentHash,node.sourceId);}
  }
  for(const node of nodes)for(const origin of node.derivesFromSourceIds)if(parent.has(origin))union(node.sourceId,origin);
  const groups=new Map<string,string[]>();
  for(const node of nodes){const root=find(node.sourceId);groups.set(root,[...(groups.get(root)??[]),node.sourceId]);}
  return [...groups.values()].map(ids=>({
    familyId:"origin:"+ids.slice().sort().join("|"),
    sourceIds:ids.slice().sort(),
    basis:["shared_bytes_or_explicit_derivation"],
  })).sort((a,b)=>a.familyId.localeCompare(b.familyId));
}

export function proximityEdges(input:{
  orderedMentionEntityIds:readonly string[];
  evidenceRef:string;
  sourceFamilyId:string;
  maxDistance?:number;
}):readonly InvestigationEdge[]{
  const max=input.maxDistance??3;
  if(!Number.isSafeInteger(max)||max<1||max>20)throw new Error("invalid_proximity_distance");
  const evidenceRef=tx(input.evidenceRef,"evidence_ref"),family=tx(input.sourceFamilyId,"source_family_id");
  const ids=input.orderedMentionEntityIds.map(id=>tx(id,"mention_entity_id"));
  const keys=new Set<string>();const out:InvestigationEdge[]=[];
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<=Math.min(ids.length-1,i+max);j++){
    if(ids[i]===ids[j])continue;
    const pair=[ids[i],ids[j]].sort();const key=pair.join("|");
    if(keys.has(key))continue;keys.add(key);
    out.push({edgeId:"proximity:"+key+":"+evidenceRef,leftEntityId:pair[0],rightEntityId:pair[1],
      type:"proximity",evidenceRefs:[evidenceRef],sourceFamilyIds:[family],firstObservedAtUtc:null,lastObservedAtUtc:null});
  }
  return out;
}

export type NextHopExplanation={
  directiveId:string;
  triggerEvidenceRefs:readonly string[];
  reason:string;
  targetQuery:string;
  stoppingCondition:string;
};
export function explainNextHop(input:NextHopExplanation):NextHopExplanation{
  const directiveId=tx(input.directiveId,"directive_id"),reason=tx(input.reason,"next_hop_reason",1200),
    targetQuery=tx(input.targetQuery,"target_query",1200),stoppingCondition=tx(input.stoppingCondition,"stopping_condition",1200);
  const refs=uniq(input.triggerEvidenceRefs,"trigger_evidence_ref");
  if(!refs.length)throw new Error("next_hop_requires_evidence");
  return {directiveId,triggerEvidenceRefs:refs,reason,targetQuery,stoppingCondition};
}

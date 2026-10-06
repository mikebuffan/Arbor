export type HopEvidence={id:string;sourceFamily:string;entity:string;relation:string;target:string;sourceSha256:string;parentHopId?:string;uncertainty:number};
export type AliasDecision={left:string;right:string;decision:"same"|"different"|"unresolved";evidenceIds:string[]};
export type Contradiction={leftEvidenceId:string;rightEvidenceId:string;reason:string};
export type HopPlan={accepted:HopEvidence[];duplicates:string[];contradictions:Contradiction[];independentFamilies:number;entityBlocks:string[]};

const signature=(e:HopEvidence)=>[e.entity,e.relation,e.target,e.sourceSha256].join("|");

export function evaluatePatternHop(input:{evidence:readonly HopEvidence[];aliases?:readonly AliasDecision[]}):HopPlan{
 const accepted:HopEvidence[]=[];const duplicates:string[]=[];const contradictions:Contradiction[]=[];const entityBlocks:string[]=[];const seen=new Set<string>();
 const unresolvedPairs=new Set((input.aliases??[]).filter(x=>x.decision==="unresolved").flatMap(x=>[`${x.left}|${x.right}`,`${x.right}|${x.left}`]));
 for(const e of input.evidence){
  if(!e.sourceSha256||e.uncertainty<0||e.uncertainty>1)continue;
  const sig=signature(e);if(seen.has(sig)){duplicates.push(e.id);continue;}seen.add(sig);
  for(const prior of accepted){
   if(prior.entity===e.entity&&prior.relation===e.relation&&prior.target!==e.target)contradictions.push({leftEvidenceId:prior.id,rightEvidenceId:e.id,reason:"Same entity/relation has incompatible targets."});
   if(unresolvedPairs.has(`${prior.entity}|${e.entity}`))entityBlocks.push(e.id);
  }
  if(!entityBlocks.includes(e.id))accepted.push(e);
 }
 return{accepted,duplicates,contradictions,independentFamilies:new Set(accepted.map(x=>x.sourceFamily)).size,entityBlocks:[...new Set(entityBlocks)]};
}

export type BranchCandidate={id:string;score:number;visited:boolean;failed:boolean};
export function chooseBoundedBranch(candidates:readonly BranchCandidate[],maxBranches:number):BranchCandidate[]{
 return candidates.filter(x=>!x.visited&&!x.failed).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,Math.max(0,maxBranches));
}

export function hopLineage(evidence:readonly HopEvidence[],leafId:string):string[]{
 const byId=new Map(evidence.map(x=>[x.id,x]));const out:string[]=[];let cur=byId.get(leafId);const seen=new Set<string>();
 while(cur&&!seen.has(cur.id)){seen.add(cur.id);out.unshift(cur.id);cur=cur.parentHopId?byId.get(cur.parentHopId):undefined;}
 return out;
}

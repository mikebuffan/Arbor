export type RelationshipStageEvidence={
 id:string;
 pair:string;
 chapter:number;
 sourceSha256:string;
 stage:string;
 trust:number;
 evidence:string[];
 rupture?:string;
 repair?:string;
 disclosure?:string;
 boundaryChange?:string;
 choiceEvidence?:string;
};
export type RelationshipStageIssue={
 pair:string;
 chapter:number;
 kind:"stage-without-evidence"|"trust-without-evidence"|"boundary-without-choice"|"source-conflict";
 message:string;
};

const validSha=(x:string)=>/^[a-f0-9]{64}$/i.test(x);

export function inspectRelationshipStages(rows:readonly RelationshipStageEvidence[]):RelationshipStageIssue[]{
 const issues:RelationshipStageIssue[]=[];
 const groups=new Map<string,RelationshipStageEvidence[]>();
 for(const row of rows){
  if(!validSha(row.sourceSha256))throw new Error("annabelle_relationship_stage_invalid_hash");
  if(!Number.isSafeInteger(row.chapter)||row.chapter<=0)throw new Error("annabelle_relationship_stage_invalid_chapter");
  (groups.get(row.pair)??(groups.set(row.pair,[]),groups.get(row.pair)!)).push(row);
 }
 for(const [pair,beats] of groups){
  beats.sort((a,b)=>a.chapter-b.chapter||a.id.localeCompare(b.id));
  const sourceByChapter=new Map<number,Set<string>>();
  for(const beat of beats)(sourceByChapter.get(beat.chapter)??(sourceByChapter.set(beat.chapter,new Set()),sourceByChapter.get(beat.chapter)!)).add(beat.sourceSha256);
  for(const [chapter,hashes] of sourceByChapter)if(hashes.size>1)issues.push({pair,chapter,kind:"source-conflict",message:"Multiple active source hashes describe the same relationship chapter."});
  for(let i=1;i<beats.length;i++){
   const prev=beats[i-1],cur=beats[i];
   const evidence=cur.evidence.filter(Boolean);
   if(cur.stage!==prev.stage&&!evidence.length&&!cur.repair&&!cur.rupture&&!cur.disclosure)
    issues.push({pair,chapter:cur.chapter,kind:"stage-without-evidence",message:`Relationship stage changed ${prev.stage} -> ${cur.stage} without source evidence.`});
   if(cur.trust!==prev.trust&&!evidence.length&&!cur.repair&&!cur.rupture&&!cur.disclosure)
    issues.push({pair,chapter:cur.chapter,kind:"trust-without-evidence",message:"Trust changed without a recorded causal beat."});
   if(cur.boundaryChange&&!cur.choiceEvidence)
    issues.push({pair,chapter:cur.chapter,kind:"boundary-without-choice",message:"Boundary changed without visible choice evidence."});
  }
 }
 return issues;
}

export type RelationshipBeat={
 pair:string;chapter:number;trust:number;stage:string;rupture?:string;repair?:string;disclosure?:string;boundaryChange?:string;choiceEvidence?:string;
};
export type RelationshipIssue={pair:string;chapter:number;kind:"unearned-trust"|"unrepaired-rupture"|"boundary-change"|"choice-missing";message:string};
export function inspectRelationshipDynamics(beats:readonly RelationshipBeat[]):RelationshipIssue[]{
 const out:RelationshipIssue[]=[];const groups=new Map<string,RelationshipBeat[]>();
 for(const beat of beats)(groups.get(beat.pair)??(groups.set(beat.pair,[]),groups.get(beat.pair)!)).push(beat);
 for(const [pair,rows] of groups){rows.sort((a,b)=>a.chapter-b.chapter);let openRupture:string|null=null;
  for(let i=0;i<rows.length;i++){const cur=rows[i],prev=rows[i-1];
   if(prev&&cur.trust>prev.trust&&!cur.repair&&!cur.disclosure)out.push({pair,chapter:cur.chapter,kind:"unearned-trust",message:"Trust increased without repair/disclosure evidence."});
   if(cur.rupture)openRupture=cur.rupture;
   if(cur.repair)openRupture=null;
   if(cur.boundaryChange&&!cur.choiceEvidence)out.push({pair,chapter:cur.chapter,kind:"boundary-change",message:"Relationship boundary changed without visible choice evidence."});
  }
  if(openRupture){const last=rows[rows.length-1];out.push({pair,chapter:last.chapter,kind:"unrepaired-rupture",message:`Rupture remains open: ${openRupture}`});}
 }
 return out;
}

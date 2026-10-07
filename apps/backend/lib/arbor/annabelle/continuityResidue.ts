export type ResidueState={
 chapter:number;
 physical:string[];
 emotional:string[];
 objects:Record<string,string>;
 unresolved:string[];
};
export type ResidueIssue={chapter:number;kind:"physical-drop"|"emotional-drop"|"object-jump"|"unresolved-drop";detail:string};

export function inspectContinuityResidue(states:readonly ResidueState[]):ResidueIssue[]{
 const out:ResidueIssue[]=[];const rows=[...states].sort((a,b)=>a.chapter-b.chapter);
 for(let i=1;i<rows.length;i++){
  const prev=rows[i-1],cur=rows[i];
  for(const x of prev.physical)if(!cur.physical.includes(x))out.push({chapter:cur.chapter,kind:"physical-drop",detail:x});
  for(const x of prev.emotional)if(!cur.emotional.includes(x)&&!cur.unresolved.some(u=>u===`resolved-emotion:${x}`))out.push({chapter:cur.chapter,kind:"emotional-drop",detail:x});
  for(const x of prev.unresolved)if(!cur.unresolved.includes(x)&&!cur.unresolved.includes(`resolved:${x}`))out.push({chapter:cur.chapter,kind:"unresolved-drop",detail:x});
  for(const [object,state] of Object.entries(prev.objects)){
    const next=cur.objects[object];
    if(next!==undefined&&next!==state&&!cur.unresolved.some(u=>u===`object-change:${object}`))out.push({chapter:cur.chapter,kind:"object-jump",detail:`${object}: ${state} -> ${next}`});
  }
 }
 return out;
}

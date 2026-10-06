export type MotifEvent={motif:string;chapter:number;role:"first"|"echo"|"evolution"|"inversion"|"payoff";sourceSha256:string};
export type MotifReport={motif:string;chapters:number[];roles:string[];warnings:string[]};
export function analyzeMotifs(events:readonly MotifEvent[]):MotifReport[]{
 const map=new Map<string,MotifEvent[]>();
 for(const e of events)(map.get(e.motif)??(map.set(e.motif,[]),map.get(e.motif)!)).push(e);
 return [...map.entries()].map(([motif,rows])=>{rows.sort((a,b)=>a.chapter-b.chapter);const roles=rows.map(x=>x.role);const warnings:string[]=[];
  if(!roles.includes("first"))warnings.push("No first-appearance record.");
  if(rows.length>=3&&!roles.includes("evolution")&&!roles.includes("inversion"))warnings.push("Repeated motif has no recorded evolution/inversion.");
  if(roles.includes("payoff")&&rows[rows.length-1].role!=="payoff")warnings.push("Motif continues after recorded payoff; verify intentional.");
  return{motif,chapters:rows.map(x=>x.chapter),roles,warnings};});
}
export type DownstreamImpact={changedChapter:number;affectedChapters:number[];reasons:string[]};
export function downstreamImpact(input:{changedChapter:number;timelineChapters?:number[];relationshipChapters?:number[];motifChapters?:number[]}):DownstreamImpact{
 const all=[...(input.timelineChapters??[]),...(input.relationshipChapters??[]),...(input.motifChapters??[])].filter(x=>x>input.changedChapter);
 return{changedChapter:input.changedChapter,affectedChapters:[...new Set(all)].sort((a,b)=>a-b),reasons:["timeline","relationship","motif"].filter((_,i)=>[input.timelineChapters,input.relationshipChapters,input.motifChapters][i]?.some(x=>x>input.changedChapter))};
}

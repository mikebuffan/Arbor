export type ScreenBeat={chapter:number;scene:string;characters:string[];relationships?:string[]};
export type ScreenTimeIssue={kind:"long-absence"|"overconcentration"|"relationship-gap";subject:string;message:string;chapters:number[]};

export function analyzeScreenTime(beats:readonly ScreenBeat[],input?:{absenceThreshold?:number;concentrationRatio?:number}):ScreenTimeIssue[]{
 const absenceThreshold=input?.absenceThreshold??8;const concentrationRatio=input?.concentrationRatio??0.75;const out:ScreenTimeIssue[]=[];
 const sorted=[...beats].sort((a,b)=>a.chapter-b.chapter);if(!sorted.length)return out;
 const charChapters=new Map<string,number[]>();const relationshipChapters=new Map<string,number[]>();
 for(const beat of sorted){
  for(const c of new Set(beat.characters))(charChapters.get(c)??(charChapters.set(c,[]),charChapters.get(c)!)).push(beat.chapter);
  for(const r of new Set(beat.relationships??[]))(relationshipChapters.get(r)??(relationshipChapters.set(r,[]),relationshipChapters.get(r)!)).push(beat.chapter);
 }
 for(const [c,chapters] of charChapters){
  const uniq=[...new Set(chapters)].sort((a,b)=>a-b);
  for(let i=1;i<uniq.length;i++)if(uniq[i]-uniq[i-1]>=absenceThreshold)out.push({kind:"long-absence",subject:c,message:`${c} disappears for ${uniq[i]-uniq[i-1]} chapters; verify intentional.`,chapters:[uniq[i-1],uniq[i]]});
  const ratio=uniq.length/new Set(sorted.map(x=>x.chapter)).size;if(ratio>=concentrationRatio&&charChapters.size>1)out.push({kind:"overconcentration",subject:c,message:`${c} appears in ${Math.round(ratio*100)}% of tracked chapters; verify supporting cast has room.`,chapters:uniq});
 }
 for(const [r,chapters] of relationshipChapters){const uniq=[...new Set(chapters)].sort((a,b)=>a-b);for(let i=1;i<uniq.length;i++)if(uniq[i]-uniq[i-1]>=absenceThreshold)out.push({kind:"relationship-gap",subject:r,message:`${r} has a long on-page gap; verify residue/progression remains legible.`,chapters:[uniq[i-1],uniq[i]]});}
 return out;
}

export type CharacterEvidenceBeat={
 id:string;
 character:string;
 chapter:number;
 sourceSha256:string;
 evidence:string[];
 voiceTraits?:string[];
 behaviorTraits?:string[];
 noticing?:string[];
 speechTraits?:string[];
 supersedesId?:string|null;
};
export type CharacterEvidenceSummary={
 character:string;
 chapters:number[];
 voiceTraits:Record<string,number>;
 behaviorTraits:Record<string,number>;
 noticing:Record<string,number>;
 speechTraits:Record<string,number>;
 sourceShas:string[];
 warnings:string[];
};

const validSha=(x:string)=>/^[a-f0-9]{64}$/i.test(x);
const tally=(rows:readonly string[])=>rows.reduce<Record<string,number>>((out,x)=>{
 const key=x.trim().toLowerCase();if(key)out[key]=(out[key]??0)+1;return out;
},{});

export function summarizeCharacterEvidence(beats:readonly CharacterEvidenceBeat[]):CharacterEvidenceSummary[]{
 const active=new Map<string,CharacterEvidenceBeat>();
 const superseded=new Set<string>();
 for(const beat of beats){
  if(!beat.id.trim())throw new Error("annabelle_character_evidence_missing_id");
  if(!validSha(beat.sourceSha256))throw new Error("annabelle_character_evidence_invalid_hash");
  if(!Number.isSafeInteger(beat.chapter)||beat.chapter<=0)throw new Error("annabelle_character_evidence_invalid_chapter");
  if(!beat.evidence.length)throw new Error("annabelle_character_evidence_without_observation");
  active.set(beat.id,beat);
 }
 for(const beat of active.values())if(beat.supersedesId){
  if(!active.has(beat.supersedesId))throw new Error("annabelle_character_evidence_missing_superseded_record");
  superseded.add(beat.supersedesId);
 }
 const groups=new Map<string,CharacterEvidenceBeat[]>();
 for(const beat of active.values())if(!superseded.has(beat.id))
  (groups.get(beat.character)??(groups.set(beat.character,[]),groups.get(beat.character)!)).push(beat);
 return [...groups.entries()].map(([character,rows])=>{
  rows.sort((a,b)=>a.chapter-b.chapter||a.id.localeCompare(b.id));
  const warnings:string[]=[];
  const chapterHashes=new Map<number,Set<string>>();
  for(const row of rows)(chapterHashes.get(row.chapter)??(chapterHashes.set(row.chapter,new Set()),chapterHashes.get(row.chapter)!)).add(row.sourceSha256);
  for(const [chapter,hashes] of chapterHashes)if(hashes.size>1)warnings.push(`Chapter ${chapter} has multiple active source hashes; reconcile before treating traits as canon.`);
  return{
   character,
   chapters:[...new Set(rows.map(x=>x.chapter))],
   voiceTraits:tally(rows.flatMap(x=>x.voiceTraits??[])),
   behaviorTraits:tally(rows.flatMap(x=>x.behaviorTraits??[])),
   noticing:tally(rows.flatMap(x=>x.noticing??[])),
   speechTraits:tally(rows.flatMap(x=>x.speechTraits??[])),
   sourceShas:[...new Set(rows.map(x=>x.sourceSha256))],
   warnings,
  };
 });
}

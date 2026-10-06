export type AnnabelleContinuityBeat = {
  chapter: number;
  scene?: string;
  elapsedDays?: number;
  season?: string;
  characters?: string[];
  relationships?: Record<string,string>;
  injuries?: Record<string,string>;
  knowledge?: Record<string,string[]>;
  motifs?: string[];
  timeOfDay?: string;
  location?: string;
  clothing?: Record<string,string>;
  objects?: Record<string,string>;
};

export type AnnabelleContinuityReport = {
  elapsedDays: number;
  seasons: string[];
  characterScreenTime: Record<string,number>;
  relationshipStages: Record<string,string>;
  injuryStates: Record<string,string>;
  knowledgeByCharacter: Record<string,string[]>;
  motifAppearances: Record<string,number[]>;
  timeOfDayByChapter: Record<number,string[]>;
  locationsByChapter: Record<number,string[]>;
  clothingStates: Record<string,string>;
  objectStates: Record<string,string>;
  warnings: string[];
};

export function buildAnnabelleContinuityReport(beats: readonly AnnabelleContinuityBeat[]): AnnabelleContinuityReport {
  const ordered=[...beats].sort((a,b)=>a.chapter-b.chapter);
  const characterScreenTime:Record<string,number>={};
  const relationshipStages:Record<string,string>={};
  const injuryStates:Record<string,string>={};
  const knowledgeByCharacter:Record<string,string[]>={};
  const motifAppearances:Record<string,number[]>={};
  const timeOfDayByChapter:Record<number,string[]>={};
  const locationsByChapter:Record<number,string[]>={};
  const clothingStates:Record<string,string>={};
  const objectStates:Record<string,string>={};
  const warnings:string[]=[];
  let elapsedDays=0;
  const seasons:string[]=[];
  let previousChapter=0;
  for(const beat of ordered){
    if(!Number.isSafeInteger(beat.chapter)||beat.chapter<=0){warnings.push("Invalid chapter number omitted.");continue;}
    if(beat.chapter<previousChapter) warnings.push("Out-of-order chapter evidence encountered.");
    previousChapter=beat.chapter;
    if(typeof beat.elapsedDays==="number"&&Number.isFinite(beat.elapsedDays)&&beat.elapsedDays>=0) elapsedDays=Math.max(elapsedDays,beat.elapsedDays);
    if(beat.season&&!seasons.includes(beat.season)) seasons.push(beat.season);
    for(const character of beat.characters??[]) characterScreenTime[character]=(characterScreenTime[character]??0)+1;
    for(const [pair,stage] of Object.entries(beat.relationships??{})) relationshipStages[pair]=stage;
    for(const [subject,state] of Object.entries(beat.injuries??{})) injuryStates[subject]=state;
    for(const [character,facts] of Object.entries(beat.knowledge??{})) {
      const existing=new Set(knowledgeByCharacter[character]??[]);
      for(const fact of facts) existing.add(fact);
      knowledgeByCharacter[character]=[...existing];
    }
    for(const motif of beat.motifs??[]) (motifAppearances[motif]??=[]).push(beat.chapter);
    if(beat.timeOfDay)(timeOfDayByChapter[beat.chapter]??=[]).push(beat.timeOfDay);
    if(beat.location)(locationsByChapter[beat.chapter]??=[]).push(beat.location);
    for(const [subject,state] of Object.entries(beat.clothing??{})) clothingStates[subject]=state;
    for(const [object,state] of Object.entries(beat.objects??{})) objectStates[object]=state;
  }
  const maxScenes=Math.max(0,...Object.values(characterScreenTime));
  if(maxScenes>=6) for(const [character,count] of Object.entries(characterScreenTime)) {
    if(count===1) warnings.push(`${character} appears in only one tracked scene; verify disappearance is intentional.`);
  }
  return {elapsedDays,seasons,characterScreenTime,relationshipStages,injuryStates,knowledgeByCharacter,motifAppearances,timeOfDayByChapter,locationsByChapter,clothingStates,objectStates,warnings};
}

export function continuityPromptBlock(report: AnnabelleContinuityReport): string {
  return [
    "ANNABELLE CONTINUITY — EVIDENCE, NOT INVENTION",
    `Elapsed book time (max recorded): ${report.elapsedDays} days`,
    `Seasons: ${report.seasons.join(", ")||"unrecorded"}`,
    `Relationship stages: ${JSON.stringify(report.relationshipStages)}`,
    `Injury/recovery states: ${JSON.stringify(report.injuryStates)}`,
    `Knowledge states: ${JSON.stringify(report.knowledgeByCharacter)}`,
    `Character scene counts: ${JSON.stringify(report.characterScreenTime)}`,
    `Motif chapters: ${JSON.stringify(report.motifAppearances)}`,
    `Time of day: ${JSON.stringify(report.timeOfDayByChapter)}`,
    `Locations: ${JSON.stringify(report.locationsByChapter)}`,
    `Clothing: ${JSON.stringify(report.clothingStates)}`,
    `Objects: ${JSON.stringify(report.objectStates)}`,
    ...report.warnings.map(w=>`WARNING: ${w}`),
    "Never advance time, relationship stage, recovery, knowledge, or motif payoff without evidence."
  ].join("\n");
}

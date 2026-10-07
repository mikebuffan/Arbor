import { checkCharacterRelationshipIntegrity, type CharacterState, type RelationshipState } from "./characterRelationshipEngine";
import { inspectPhysicalContinuity, type PhysicalState } from "./physicalContinuity";
import { buildAnnabelleContinuityReport, type AnnabelleContinuityBeat } from "./continuityEngine";
import { analyzeScreenTime, type ScreenBeat } from "./screenTimeBalance";
import { analyzeMotifs, downstreamImpact, type MotifEvent } from "./motifImpact";
import { sceneStateDelta, type SceneState } from "./sceneStateDelta";

export type EditorialChapterState = {
  chapterNumber: number;
  sourceSha256: string;
  characters?: readonly CharacterState[];
  relationships?: readonly RelationshipState[];
  physical?: readonly PhysicalState[];
  continuity?: readonly AnnabelleContinuityBeat[];
  screenBeats?: readonly ScreenBeat[];
  motifs?: readonly MotifEvent[];
  scenes?: readonly { before: SceneState; after: SceneState; sceneId: string }[];
};

export type EditorialContinuityLedgerReport = {
  chapters: number[];
  sourceHashes: Record<number,string>;
  characterRelationshipIssues: ReturnType<typeof checkCharacterRelationshipIntegrity>;
  physicalIssues: ReturnType<typeof inspectPhysicalContinuity>;
  continuity: ReturnType<typeof buildAnnabelleContinuityReport>;
  screenTime: ReturnType<typeof analyzeScreenTime>;
  motifs: ReturnType<typeof analyzeMotifs>;
  sceneDeltas: { chapterNumber:number; sceneId:string; changed:boolean; dimensions:string[]; details:string[] }[];
  downstreamByChapter: Record<number,ReturnType<typeof downstreamImpact>>;
};

const validSha=(value:string)=>/^[a-f0-9]{64}$/i.test(value);

export function buildEditorialContinuityLedger(states:readonly EditorialChapterState[]):EditorialContinuityLedgerReport{
  const sourceHashes:Record<number,string>={};
  const byChapter=new Map<number,EditorialChapterState>();
  for(const state of states){
    if(!Number.isSafeInteger(state.chapterNumber)||state.chapterNumber<=0)throw new Error("annabelle_ledger_invalid_chapter");
    if(!validSha(state.sourceSha256))throw new Error("annabelle_ledger_invalid_source_hash");
    const prior=byChapter.get(state.chapterNumber);
    if(prior&&prior.sourceSha256!==state.sourceSha256)throw new Error("annabelle_ledger_source_conflict");
    if(!prior)byChapter.set(state.chapterNumber,state);
    sourceHashes[state.chapterNumber]=state.sourceSha256;
  }
  const ordered=[...byChapter.values()].sort((a,b)=>a.chapterNumber-b.chapterNumber);
  const characters=ordered.flatMap(x=>[...(x.characters??[])]);
  const relationships=ordered.flatMap(x=>[...(x.relationships??[])]);
  const physical=ordered.flatMap(x=>[...(x.physical??[])]);
  const continuityBeats=ordered.flatMap(x=>[...(x.continuity??[])]);
  const screenBeats=ordered.flatMap(x=>[...(x.screenBeats??[])]);
  const motifEvents=ordered.flatMap(x=>[...(x.motifs??[])]);
  const sceneDeltas=ordered.flatMap(chapter=>(chapter.scenes??[]).map(scene=>{
    const delta=sceneStateDelta(scene.before,scene.after);
    return{chapterNumber:chapter.chapterNumber,sceneId:scene.sceneId,...delta};
  }));
  const chapters=ordered.map(x=>x.chapterNumber);
  const downstreamByChapter:Record<number,ReturnType<typeof downstreamImpact>>={};
  for(const chapterNumber of chapters) downstreamByChapter[chapterNumber]=downstreamImpact({
    changedChapter:chapterNumber,
    timelineChapters:continuityBeats.map(x=>x.chapter),
    relationshipChapters:relationships.map(x=>x.chapter),
    motifChapters:motifEvents.map(x=>x.chapter),
  });
  return{
    chapters,
    sourceHashes,
    characterRelationshipIssues:checkCharacterRelationshipIntegrity({characters,relationships}),
    physicalIssues:inspectPhysicalContinuity(physical),
    continuity:buildAnnabelleContinuityReport(continuityBeats),
    screenTime:analyzeScreenTime(screenBeats),
    motifs:analyzeMotifs(motifEvents),
    sceneDeltas,
    downstreamByChapter,
  };
}

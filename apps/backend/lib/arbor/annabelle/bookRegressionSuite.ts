import{runAnnabelleBookSelfCheck}from"./bookSelfCheck";
import{analyzeManuscriptRepetition,type RepetitionOccurrence}from"./manuscriptRepetition";
import{inspectPhysicalContinuity,type PhysicalState}from"./physicalContinuity";
import{inspectRelationshipDynamics,type RelationshipBeat}from"./relationshipDynamics";
import{analyzeMotifs,downstreamImpact,type MotifEvent}from"./motifImpact";
import{buildAnnabelleContinuityReport,type AnnabelleContinuityBeat}from"./continuityEngine";
import{analyzeScreenTime,type ScreenBeat}from"./screenTimeBalance";
import{inspectIntimacySequence,type IntimacySequence}from"./intimacyMechanics";

export type BookRegressionInput={
 text:string;
 repetition?:readonly RepetitionOccurrence[];
 physical?:readonly PhysicalState[];
 relationships?:readonly RelationshipBeat[];
 motifs?:readonly MotifEvent[];
 intentionalMotifs?:readonly string[];
 continuity?:readonly AnnabelleContinuityBeat[];
 screenBeats?:readonly ScreenBeat[];
 intimacySequences?:readonly IntimacySequence[];
 changedChapter?:number;
};

export function runBookRegressionSuite(input:BookRegressionInput){
 const local=runAnnabelleBookSelfCheck(input.text);
 const repetition=analyzeManuscriptRepetition({occurrences:input.repetition??[],intentionalMotifs:input.intentionalMotifs});
 const physical=inspectPhysicalContinuity(input.physical??[]);
 const relationships=inspectRelationshipDynamics(input.relationships??[]);
 const motifs=analyzeMotifs(input.motifs??[]);
 const continuity=buildAnnabelleContinuityReport(input.continuity??[]);
 const screenTime=analyzeScreenTime(input.screenBeats??[]);
 const intimacy=(input.intimacySequences??[]).flatMap((sequence,index)=>
  inspectIntimacySequence(sequence).map(issue=>({...issue,sequenceIndex:index})));
 const changedChapter=input.changedChapter;
 const downstream=changedChapter===undefined?null:downstreamImpact({
  changedChapter,
  timelineChapters:(input.continuity??[]).map(x=>x.chapter),
  relationshipChapters:(input.relationships??[]).map(x=>x.chapter),
  motifChapters:(input.motifs??[]).map(x=>x.chapter),
 });
 const blocking=local.blockers.length+physical.length+relationships.filter(x=>x.kind!=="unrepaired-rupture").length;
 return{local,repetition,physical,relationships,motifs,continuity,screenTime,intimacy,downstream,blocking};
}

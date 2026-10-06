import{runAnnabelleBookSelfCheck}from"./bookSelfCheck";
import{analyzeManuscriptRepetition,type RepetitionOccurrence}from"./manuscriptRepetition";
import{inspectPhysicalContinuity,type PhysicalState}from"./physicalContinuity";
import{inspectRelationshipDynamics,type RelationshipBeat}from"./relationshipDynamics";
import{analyzeMotifs,type MotifEvent}from"./motifImpact";
export type BookRegressionInput={text:string;repetition?:readonly RepetitionOccurrence[];physical?:readonly PhysicalState[];relationships?:readonly RelationshipBeat[];motifs?:readonly MotifEvent[];intentionalMotifs?:readonly string[]};
export function runBookRegressionSuite(input:BookRegressionInput){
 const local=runAnnabelleBookSelfCheck(input.text);
 const repetition=analyzeManuscriptRepetition({occurrences:input.repetition??[],intentionalMotifs:input.intentionalMotifs});
 const physical=inspectPhysicalContinuity(input.physical??[]);
 const relationships=inspectRelationshipDynamics(input.relationships??[]);
 const motifs=analyzeMotifs(input.motifs??[]);
 return{local,repetition,physical,relationships,motifs,blocking:local.blockers.length+physical.length+relationships.filter(x=>x.kind!=="unrepaired-rupture").length};
}

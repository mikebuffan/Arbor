import {
  classifyDocumentTypology,
  extractStructuralEntities,
  type DocumentTypology,
  type EvidenceMention,
} from "./investigationIngestion";
import { computeCogMetrics, type InvestigationEdge } from "./investigationGraph";
import {
  createRoundaboutDirective,
  queueResearchInterrupt,
  type ResearchInterrupt,
  type RoundaboutDirective,
} from "./findingIntegrity";
import {
  detectRecurringPatterns,
  detectResponsePatternShifts,
  detectTemporalConflicts,
  type RecurringPattern,
  type ResponsePatternShift,
  type TimelineObservation,
  type TranscriptAnswer,
} from "./timelineAnalysis";

export type ResearchPassInput = {
  passId:string;
  documentId:string;
  filename:string|null;
  text:string;
  mentions:readonly EvidenceMention[];
  edges:readonly InvestigationEdge[];
  timeline:readonly TimelineObservation[];
  transcriptTurns:readonly TranscriptAnswer[];
  patternRows:readonly {observationId:string;key:string;atUtc:string}[];
  anomalyDirectives:readonly RoundaboutDirective[];
  checkpointRef:string;
};

export type ResearchPassOutput = {
  passId:string;
  documentId:string;
  typology:DocumentTypology;
  structuralEntities:ReturnType<typeof extractStructuralEntities>;
  primaryConnectedEntityId:string|null;
  cogMetrics:ReturnType<typeof computeCogMetrics>;
  temporalConflicts:ReturnType<typeof detectTemporalConflicts>;
  recurringPatterns:readonly RecurringPattern[];
  responsePatternShifts:readonly ResponsePatternShift[];
  interrupts:readonly ResearchInterrupt[];
  unresolvedIdentityMentionIds:readonly string[];
  nextDirectiveIds:readonly string[];
  status:"hold_for_source_identity_privacy_and_human_review";
};

const required=(value:unknown,field:string):string=>{
  if(typeof value!=="string"||!value.trim())throw new Error("invalid_"+field);
  return value.trim();
};

/** Pure orchestration for a single already-extracted chunk/document pass.
 * It cannot fetch sources, merge identities, start workers, publish findings,
 * or turn proximity/absence/model output into evidence of conduct.
 */
export function runInvestigationResearchPass(input:ResearchPassInput):ResearchPassOutput{
  const passId=required(input.passId,"research_pass_id"),documentId=required(input.documentId,"document_id"),
    checkpointRef=required(input.checkpointRef,"checkpoint_ref");
  if(typeof input.text!=="string"||input.text.length>1_000_000)throw new Error("invalid_research_pass_text");

  const typology=classifyDocumentTypology({filename:input.filename??undefined,textSample:input.text.slice(0,50_000)});
  const structuralEntities=extractStructuralEntities(input.text);
  const cogMetrics=computeCogMetrics(input.edges);
  const temporalConflicts=detectTemporalConflicts(input.timeline);
  const recurringPatterns=detectRecurringPatterns(input.patternRows);
  const responsePatternShifts=typology==="legal_deposition"||typology==="interview_transcript"
    ?detectResponsePatternShifts(input.transcriptTurns):[];

  const directives=input.anomalyDirectives.slice(0,3).map(createRoundaboutDirective);
  const interrupts=directives.map((directive,index)=>queueResearchInterrupt({
    interruptId:passId+":interrupt:"+(index+1),
    parentCheckpointRef:checkpointRef,
    anomalyRef:directive.anomalyRef,
    directive,
    status:"queued",
  }));
  const unresolvedIdentityMentionIds=input.mentions
    .filter(mention=>mention.entityCandidateId===null).map(mention=>mention.mentionId).sort();

  return {
    passId,documentId,typology,structuralEntities,
    primaryConnectedEntityId:cogMetrics[0]?.entityId??null,
    cogMetrics,temporalConflicts,recurringPatterns,responsePatternShifts,interrupts,
    unresolvedIdentityMentionIds,nextDirectiveIds:directives.map(d=>d.directiveId),
    status:"hold_for_source_identity_privacy_and_human_review",
  };
}

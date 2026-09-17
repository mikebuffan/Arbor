import type { LongitudinalObservationInput } from "./longitudinalExportAdapter.js";

export type ArchaeologyEvidence = {
  message_id:string;
  conversation_id:string;
  source_file:string;
  role:string;
  timestamp:string;
  conversation_title?:string;
  excerpt:string;
};
export type ArchaeologyFinding = {
  key:string;
  type:string;
  title:string;
  statement:string;
  confidence:number;
  evidence:ArchaeologyEvidence[];
};
export type ArborArchaeologyReport = { report:string; date:string; findings:ArchaeologyFinding[] };

/**
 * Preserve direct receipts as direct observations and keep the report synthesis
 * visibly inferred. One finding therefore becomes N direct evidence observations
 * plus one synthesis observation. Chronology remains attached to source receipts;
 * no causal relationship is invented here.
 */
export function archaeologyReportToLongitudinalObservations(report:ArborArchaeologyReport):LongitudinalObservationInput[]{
  const out:LongitudinalObservationInput[]=[];
  for(const finding of report.findings){
    const directIds:string[]=[];
    for(const receipt of finding.evidence){
      const id=`archaeology:${finding.key}:receipt:${receipt.message_id}`;
      directIds.push(id);
      out.push({
        id,
        scope:"arbor",
        subjectKey:"arbor",
        attributeKey:finding.key,
        value:{excerpt:receipt.excerpt,title:finding.title,findingType:finding.type,role:receipt.role,conversationId:receipt.conversation_id,conversationTitle:receipt.conversation_title,sourceFile:receipt.source_file},
        polarity:1,
        observedAt:receipt.timestamp,
        confidence:finding.confidence,
        evidence:[{sourceId:`message:${receipt.message_id}`,occurredAt:receipt.timestamp,kind:"retrieved_record",excerpt:receipt.excerpt,confidence:1}],
        isInference:false,
        tags:[`finding:${finding.key}`,`finding-type:${finding.type}`,`conversation:${receipt.conversation_id}`],
      });
    }
    const synthesisAt=finding.evidence.map(e=>e.timestamp).sort().at(-1)??`${report.date}T00:00:00Z`;
    out.push({
      id:`archaeology:${finding.key}:synthesis`,
      scope:"arbor",
      subjectKey:"arbor",
      attributeKey:finding.key,
      value:{title:finding.title,statement:finding.statement,findingType:finding.type},
      polarity:1,
      observedAt:synthesisAt,
      confidence:finding.confidence,
      evidence:finding.evidence.map(e=>({sourceId:`message:${e.message_id}`,occurredAt:e.timestamp,kind:"retrieved_record",excerpt:e.excerpt,confidence:1})),
      isInference:true,
      inferenceMethod:"full-history-archaeology-synthesis",
      tags:[`finding:${finding.key}`,`finding-type:${finding.type}`,`derived-from:${directIds.length}-receipts`,`report:${report.report}`],
    });
  }
  return out;
}

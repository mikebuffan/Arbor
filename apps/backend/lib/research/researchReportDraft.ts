import { classifyResearchFinding, type ResearchFindingCandidate } from './researchFindingClassification';
import { publicationPreflight, type PublicationPreflight } from './publicationPreflight';

/** Draft-only report; source IDs are internal references, not verified citations.
 * Caller supplies reviewed original-page locators through a separate workflow.
 * This formatter does not perform PII detection or authorize release.
 */
export type ResearchReportDraftInput = {
  reportId: string;
  asOf: string;
  scope: string;
  candidates: readonly ResearchFindingCandidate[];
  preflight: PublicationPreflight;
  limitations: readonly string[];
  unresolvedQuestions: readonly string[];
};
const required=(value:unknown,field:string):string=>{
 if(typeof value!=='string'||!value.trim()) throw new Error(`invalid_${field}`);
 return value.trim();
};
const lines=(values:unknown,field:string):string[]=>{
 if(!Array.isArray(values)) throw new Error(`invalid_${field}`);
 return values.map(value=>required(value,field));
};
export function formatResearchReportDraft(input: ResearchReportDraftInput): string {
 const reportId=required(input.reportId,'report_id');
 const scope=required(input.scope,'scope');
 const asOf=required(input.asOf,'as_of');
 if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(asOf)||new Date(asOf+'T00:00:00.000Z').toISOString().slice(0,10)!==asOf) {
   throw new Error('invalid_as_of');
 }
 if(!Array.isArray(input.candidates)) throw new Error('invalid_candidates');
 const candidates=input.candidates.map(classifyResearchFinding);
 const preflight=publicationPreflight(input.preflight);
 const limitations=lines(input.limitations,'limitation');
 const unresolved=lines(input.unresolvedQuestions,'unresolved_question');
 return [
 'DRAFT — NOT FOR PUBLICATION — '+reportId,
 'As of: '+asOf,
 'Scope: '+scope,
 'Status: '+preflight.sharingStatus,
 'Human release decision ready: '+(preflight.readyForHumanReleaseDecision?'review receipts present; separate authorization required':'NO'),
 'Hold reasons: '+(preflight.holdReasons.join(', ')||'separate release authorization still required'),
 ...candidates.map((candidate,index)=>[
  'Candidate '+(index+1)+': '+candidate.kind+' — '+candidate.candidateId,
  'Explanation: '+candidate.explanation,
  'Source record IDs (NOT verified citations): '+(candidate.sourceRecordIds.join(', ')||'none'),
  'Counterevidence record IDs: '+(candidate.counterevidenceRecordIds.join(', ')||'none'),
  'Status: '+candidate.reviewStatus+' / '+candidate.sharingStatus,
 ].join('\\n')),
 'Limitations: '+(limitations.join(' | ')||'not supplied'),
 'Unresolved questions: '+(unresolved.join(' | ')||'not supplied'),
 'No automated publication. Association or allegation alone is not proof of wrongdoing.',
 ].join('\\n\\n');
}

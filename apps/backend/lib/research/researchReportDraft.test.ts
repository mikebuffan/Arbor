import { describe,expect,it } from 'vitest';
import { formatResearchReportDraft,type ResearchReportDraftInput } from './researchReportDraft';
const fixture=():ResearchReportDraftInput=>({
 reportId:'synthetic-report',asOf:'2026-09-22',scope:'Synthetic fixture',
 candidates:[{candidateId:'synthetic-claim',kind:'conflict',sourceRecordIds:['synthetic-source-a'],
 counterevidenceRecordIds:['synthetic-source-b'],explanation:'Contradictory synthetic records',
 independentOriginalPageReview:false,contextVerified:false,privacyReviewPassed:false,publicationReviewPassed:false}],
 preflight:{sourceRecordIds:['synthetic-source-a'],reviewedOriginalPageIds:[],privacyReviewReceiptId:null,
 publicationReviewReceiptId:null,unresolvedPrivacyFlags:['synthetic-privacy-hold'],unresolvedSourceFlags:[]},
 limitations:['Synthetic only'],unresolvedQuestions:['What is missing?'],
});
describe('research report draft',()=>{
 it('preserves counterevidence, limitations and unresolved questions under HOLD',()=>{
  const output=formatResearchReportDraft(fixture());
  for(const part of ['NOT FOR PUBLICATION','synthetic-source-b','Synthetic only','What is missing?',
    'unresolved_privacy_flags','separate release authorization','not proof of wrongdoing']) expect(output).toContain(part);
 });
 it('still refuses publication with complete review receipts',()=>{
  const input=fixture();input.preflight={...input.preflight,reviewedOriginalPageIds:['synthetic-page'],
   privacyReviewReceiptId:'synthetic-privacy',publicationReviewReceiptId:'synthetic-publication',unresolvedPrivacyFlags:[]};
  expect(formatResearchReportDraft(input)).toContain('Status: hold_for_explicit_release_authorization');
 });
 it('rejects invalid dates and unverified findings',()=>{
  expect(()=>formatResearchReportDraft({...fixture(),asOf:'2026-02-30'})).toThrow('invalid_as_of');
  const input=fixture();input.candidates=[{...input.candidates[0],kind:'finding'}];
  expect(()=>formatResearchReportDraft(input)).toThrow('finding_requires_verified_source_and_context');
 });
});

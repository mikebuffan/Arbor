import {describe,expect,it} from 'vitest';
import {recordPrivacyReview,type PrivacyReviewLedger} from './privacyReviewLedger';
const fixture=(patch:Partial<PrivacyReviewLedger>={}):PrivacyReviewLedger=>({
 reviewerRef:'synthetic-reviewer',reviewedAtUtc:'2026-09-22T01:00:00.000Z',
 originalPageReviewIds:['synthetic-page-review'],flags:[],...patch});
describe('synthetic-only privacy review ledger',()=>{
 it('never releases a record even with no declared flags',()=>{
  expect(recordPrivacyReview(fixture()).status).toBe('hold_for_publication_review_and_release_authorization');
 });
 it('holds withheld flags and missing redaction artifacts',()=>{
  const r=recordPrivacyReview(fixture({flags:[
   {flagId:'f1',sourceRecordId:'synthetic-source',pageRef:'synthetic-page-review',decision:'withhold',redactionArtifactRef:null},
   {flagId:'f2',sourceRecordId:'synthetic-source',pageRef:'synthetic-page-review',decision:'redact',redactionArtifactRef:null},
  ]}));
  expect(r.unresolvedFlagIds).toEqual(['f1','f2']);
 });
 it('a declared artifact is not proof of correct redaction or release',()=>{
  const r=recordPrivacyReview(fixture({flags:[{flagId:'f1',sourceRecordId:'synthetic-source',
   pageRef:'synthetic-page-review',decision:'redact',redactionArtifactRef:'synthetic-artifact'}]}));
  expect(r.unresolvedFlagIds).toEqual([]);
  expect(r.status).toBe('hold_for_publication_review_and_release_authorization');
 });
 it('rejects flags without original page review and duplicate ids',()=>{
  const f={flagId:'f1',sourceRecordId:'synthetic-source',pageRef:'unreviewed',
   decision:'withhold' as const,redactionArtifactRef:null};
  expect(()=>recordPrivacyReview(fixture({flags:[f]}))).toThrow('privacy_flag_unreviewed_page');
  expect(()=>recordPrivacyReview(fixture({flags:[{...f,pageRef:'synthetic-page-review'},
   {...f,pageRef:'synthetic-page-review'}]}))).toThrow('duplicate_privacy_flag_id');
 });
 it('rejects fake timestamps and missing review inventory',()=>{
  expect(()=>recordPrivacyReview(fixture({reviewedAtUtc:'2026-02-30T01:00:00.000Z'})))
   .toThrow('invalid_privacy_reviewed_at_utc');
  expect(()=>recordPrivacyReview(fixture({originalPageReviewIds:[]})))
   .toThrow('privacy_original_page_review_required');
 });
});

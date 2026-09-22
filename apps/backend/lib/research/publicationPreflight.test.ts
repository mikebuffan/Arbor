import { describe, expect, it } from 'vitest';
import { publicationPreflight, type PublicationPreflight } from './publicationPreflight';
const fixture=(overrides:Partial<PublicationPreflight>={}):PublicationPreflight=>({
 sourceRecordIds:['synthetic-source'], reviewedOriginalPageIds:['synthetic-page'],
 privacyReviewReceiptId:'synthetic-privacy-review', publicationReviewReceiptId:'synthetic-publication-review',
 unresolvedPrivacyFlags:[], unresolvedSourceFlags:[], ...overrides,
});
describe('publication preflight — synthetic only',()=>{
 it('never grants automatic sharing, even with all receipts',()=>{
   expect(publicationPreflight(fixture())).toEqual({
    readyForHumanReleaseDecision:true,holdReasons:[],sharingStatus:'hold_for_explicit_release_authorization'
   });
 });
 it('holds missing receipts and original page/source reviews',()=>{
   expect(publicationPreflight(fixture({sourceRecordIds:[],reviewedOriginalPageIds:[],
    privacyReviewReceiptId:null,publicationReviewReceiptId:null})).holdReasons)
    .toEqual(['source_required','original_page_review_required','privacy_review_required','publication_review_required']);
 });
 it('holds unresolved privacy and source flags',()=>{
   expect(publicationPreflight(fixture({unresolvedPrivacyFlags:['synthetic-private-person'],
    unresolvedSourceFlags:['synthetic-page-mismatch']})).holdReasons)
    .toEqual(['unresolved_privacy_flags','unresolved_source_flags']);
 });
 it('rejects duplicate or empty receipts and flags',()=>{
   expect(()=>publicationPreflight(fixture({sourceRecordIds:['a',' a ']}))).toThrow('duplicate_source_record_id');
   expect(()=>publicationPreflight(fixture({unresolvedPrivacyFlags:[' ']}))).toThrow('invalid_privacy_flag');
   expect(()=>publicationPreflight(fixture({privacyReviewReceiptId:' '}))).toThrow('invalid_privacy_review_receipt_id');
 });
 it('does not mutate caller evidence references',()=>{
   const input=fixture({sourceRecordIds:[' synthetic-source ']});
   publicationPreflight(input);
   expect(input.sourceRecordIds).toEqual([' synthetic-source ']);
 });
});

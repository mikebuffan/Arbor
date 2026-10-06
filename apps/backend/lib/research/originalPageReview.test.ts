import { describe,expect,it } from 'vitest';
import { capturePdfOriginalBytes,createPdfPageEvidenceRecords } from './pdfPageProvenance';
import { capturePdfPageImageReceipt } from './pdfPageImageProvenance';
import { selectExactPageObservation } from './pageObservation';
import { recordOriginalPageReview } from './originalPageReview';
const fixture=async()=>{
 const original=await capturePdfOriginalBytes({sourceUri:'https://example.org/benign.pdf',
 documentId:'synthetic',bytes:new TextEncoder().encode('%PDF-1.4\\nfixture'),declaredPageCount:1});
 const page=createPdfPageEvidenceRecords(original,[{physicalPdfPage:1,extractionStatus:'text_layer',
 extractedText:'Synthetic quote and context'}])[0];
 const image=await capturePdfPageImageReceipt({original,page,
 pngBytes:new Uint8Array([137,80,78,71,13,10,26,10,1,2,3]),
 rendererVersion:'synthetic-poppler',dpi:144,renderedAtUtc:'2026-09-22T00:00:00.000Z'});
 const observation=selectExactPageObservation({page,startUtf16:0,endUtf16:15});
 return {original,page,image,observation,sourceRecordId:'synthetic-record',
 reviewerRef:'synthetic-reviewer',reviewedAtUtc:'2026-09-22T01:00:00.000Z',
 contextChecked:true,quoteVisuallyConfirmed:true,reviewerIndependentOfExtractor:true};
};
describe('synthetic original-page review receipt contract',()=>{
 it('retains exact source, image and quote span and still holds publication',async()=>{
 const x=await fixture();
 expect(recordOriginalPageReview(x)).toMatchObject({
 originalBytesSha256:x.original.originalBytesSha256,physicalPdfPage:1,
 imageBytesSha256:x.image.imageBytesSha256,observationStartUtf16:0,
 observationEndUtf16:15,status:'hold_for_privacy_and_publication_review'});
 });
 it('rejects substituted image',async()=>{
 const x=await fixture();
 expect(()=>recordOriginalPageReview({...x,image:{...x.image,imageBytesSha256:'invalid'}}))
 .toThrow('original_page_review_binding_mismatch');
 });
 it('rejects substituted quote',async()=>{
 const x=await fixture();
 expect(()=>recordOriginalPageReview({...x,observation:{...x.observation,
 observation:{...x.observation.observation,statement:'fabricated'}}}))
 .toThrow('original_page_review_binding_mismatch');
 });
 it('requires explicit independent review, context and visual checks',async()=>{
 const x=await fixture();
 for(const field of ['contextChecked','quoteVisuallyConfirmed','reviewerIndependentOfExtractor'] as const){
 expect(()=>recordOriginalPageReview({...x,[field]:false})).toThrow('original_page_review_incomplete');
 }
 });
 it('rejects invalid timestamps and empty reviewer',async()=>{
 const x=await fixture();
 expect(()=>recordOriginalPageReview({...x,reviewedAtUtc:'2026-02-30T01:00:00.000Z'}))
 .toThrow('invalid_reviewed_at_utc');
 expect(()=>recordOriginalPageReview({...x,reviewerRef:' '})).toThrow('invalid_reviewer_ref');
 });
});

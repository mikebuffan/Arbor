import { pageImageMatchesOriginal, type PdfPageImageReceipt } from './pdfPageImageProvenance';
import { matchesPageObservation, type PageObservationCandidate } from './pageObservation';
import type { PdfOriginalCapture, PdfPageEvidenceRecord } from './pdfPageProvenance';

/** Records a synthetic/manual review claim, NOT verification by software.
 * Independent reviewers and source authenticity must be established outside
 * this pure contract. Privacy and publication remain permanently on HOLD.
 */
export type OriginalPageReviewReceipt = {
 sourceRecordId:string; originalBytesSha256:string; physicalPdfPage:number;
 imageBytesSha256:string; observationStartUtf16:number; observationEndUtf16:number;
 reviewerRef:string; reviewedAtUtc:string; contextChecked:true;
 quoteVisuallyConfirmed:true; reviewerIndependentOfExtractor:true;
 status:'hold_for_privacy_and_publication_review';
};
const required=(value:unknown,field:string):string=>{
 if(typeof value!=='string'||!value.trim())throw new Error('invalid_'+field);
 return value.trim();
};
export function recordOriginalPageReview(input:{
 original:PdfOriginalCapture; page:PdfPageEvidenceRecord;
 image:PdfPageImageReceipt; observation:PageObservationCandidate;
 sourceRecordId:string; reviewerRef:string; reviewedAtUtc:string;
 contextChecked:boolean; quoteVisuallyConfirmed:boolean;
 reviewerIndependentOfExtractor:boolean;
}):OriginalPageReviewReceipt{
 if(!pageImageMatchesOriginal(input.image,input.original,input.page)||
  !matchesPageObservation(input.observation,input.page))throw new Error('original_page_review_binding_mismatch');
 if(input.contextChecked!==true||input.quoteVisuallyConfirmed!==true||
  input.reviewerIndependentOfExtractor!==true)throw new Error('original_page_review_incomplete');
 const sourceRecordId=required(input.sourceRecordId,'source_record_id');
 const reviewerRef=required(input.reviewerRef,'reviewer_ref');
 const reviewedAtUtc=required(input.reviewedAtUtc,'reviewed_at_utc');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(reviewedAtUtc)||
  !Number.isFinite(Date.parse(reviewedAtUtc))||
  new Date(reviewedAtUtc).toISOString()!==reviewedAtUtc)throw new Error('invalid_reviewed_at_utc');
 return {sourceRecordId,originalBytesSha256:input.image.originalBytesSha256,
  physicalPdfPage:input.image.physicalPdfPage,imageBytesSha256:input.image.imageBytesSha256,
  observationStartUtf16:input.observation.span.startUtf16,
  observationEndUtf16:input.observation.span.endUtf16,
  reviewerRef,reviewedAtUtc,contextChecked:true,quoteVisuallyConfirmed:true,
  reviewerIndependentOfExtractor:true,status:'hold_for_privacy_and_publication_review'};
}

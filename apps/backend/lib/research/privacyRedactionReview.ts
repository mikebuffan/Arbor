export type PrivacyRedactionCandidate = {
  sourceRecordId: string;
  text: string;
  spans: readonly { startUtf16: number; endUtf16: number; reason: "victim_or_private_person" | "contact_information" | "other_sensitive_identifier" }[];
};
export type PrivacyRedactionReview = {
  sourceRecordId: string;
  redactedText: string;
  reviewedSpanCount: number;
  reviewerRef: string;
  reviewedAtUtc: string;
  status: "hold_for_independent_privacy_and_release_review";
};
const required=(v:unknown,f:string):string=>{if(typeof v!=="string"||!v.trim())throw new Error("invalid_"+f);return v.trim();};
/**
 * Pure explicit-span redaction. This deliberately does NOT detect PII or infer
 * who is a victim/private person. A trusted upstream human/privacy process must
 * supply spans. Output remains HOLD and must never itself authorize release.
 */
export function reviewExplicitPrivacyRedactions(input:{candidate:PrivacyRedactionCandidate;reviewerRef:string;reviewedAtUtc:string;reviewerConfirmedAllVisibleTextReviewed:boolean}):PrivacyRedactionReview{
  const sourceRecordId=required(input.candidate.sourceRecordId,"source_record_id");
  if(typeof input.candidate.text!=="string"||input.candidate.text.length>200000)throw new Error("invalid_privacy_text");
  if(input.reviewerConfirmedAllVisibleTextReviewed!==true)throw new Error("privacy_full_text_review_required");
  const reviewerRef=required(input.reviewerRef,"reviewer_ref");
  const reviewedAtUtc=required(input.reviewedAtUtc,"reviewed_at_utc");
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(reviewedAtUtc)||!Number.isFinite(Date.parse(reviewedAtUtc))||new Date(reviewedAtUtc).toISOString()!==reviewedAtUtc)throw new Error("invalid_reviewed_at_utc");
  const spans=[...input.candidate.spans].map(s=>{
    if(!Number.isSafeInteger(s.startUtf16)||!Number.isSafeInteger(s.endUtf16)||s.startUtf16<0||s.endUtf16<=s.startUtf16||s.endUtf16>input.candidate.text.length)throw new Error("invalid_privacy_redaction_span");
    if(!["victim_or_private_person","contact_information","other_sensitive_identifier"].includes(s.reason))throw new Error("invalid_privacy_redaction_reason");
    return {...s};
  }).sort((a,b)=>a.startUtf16-b.startUtf16||a.endUtf16-b.endUtf16);
  for(let i=1;i<spans.length;i++)if(spans[i].startUtf16<spans[i-1].endUtf16)throw new Error("overlapping_privacy_redaction_spans");
  let out="",cursor=0;
  for(const span of spans){out+=input.candidate.text.slice(cursor,span.startUtf16)+"[REDACTED]";cursor=span.endUtf16;}
  out+=input.candidate.text.slice(cursor);
  return {sourceRecordId,redactedText:out,reviewedSpanCount:spans.length,reviewerRef,reviewedAtUtc,status:"hold_for_independent_privacy_and_release_review"};
}

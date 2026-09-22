/** Synthetic-safe privacy review ledger. No raw names, excerpts or identifiers
 * are accepted. A receipt records a claimed review, not actual PII detection,
 * redaction, permission to share or a release authorization.
 */
export type PrivacyReviewDecision='redact'|'withhold'|'no_sensitive_content_identified';
export type PrivacyReviewFlag={flagId:string;sourceRecordId:string;pageRef:string;decision:PrivacyReviewDecision;redactionArtifactRef:string|null};
export type PrivacyReviewLedger={reviewerRef:string;reviewedAtUtc:string;flags:readonly PrivacyReviewFlag[];originalPageReviewIds:readonly string[]};
export type PrivacyReviewLedgerResult={reviewReceiptRef:string;unresolvedFlagIds:readonly string[];
 reviewedOriginalPageIds:readonly string[];status:'hold_for_publication_review_and_release_authorization'};
const text=(v:unknown,k:string)=>{if(typeof v!=='string'||!v.trim()||v.length>160)throw new Error('invalid_'+k);return v.trim();};
const unique=(v:unknown,k:string)=>{if(!Array.isArray(v))throw new Error('invalid_'+k);
 const out=v.map(x=>text(x,k));if(new Set(out).size!==out.length)throw new Error('duplicate_'+k);return out;};
export function recordPrivacyReview(input:PrivacyReviewLedger):PrivacyReviewLedgerResult{
 const reviewer=text(input.reviewerRef,'privacy_reviewer_ref');
 const at=text(input.reviewedAtUtc,'privacy_reviewed_at_utc');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(at)||
  !Number.isFinite(Date.parse(at))||new Date(at).toISOString()!==at)
  throw new Error('invalid_privacy_reviewed_at_utc');
 const pages=unique(input.originalPageReviewIds,'original_page_review_id');
 if(!pages.length)throw new Error('privacy_original_page_review_required');
 if(!Array.isArray(input.flags))throw new Error('invalid_privacy_flags');
 const seen=new Set<string>(),unresolved:string[]=[];
 for(const flag of input.flags){
  const id=text(flag.flagId,'privacy_flag_id');
  text(flag.sourceRecordId,'privacy_source_record_id');text(flag.pageRef,'privacy_page_ref');
  if(!pages.includes(flag.pageRef))throw new Error('privacy_flag_unreviewed_page');
  if(seen.has(id))throw new Error('duplicate_privacy_flag_id');
  seen.add(id);
  if(!(['redact','withhold','no_sensitive_content_identified'] as unknown[]).includes(flag.decision))
   throw new Error('invalid_privacy_decision');
  if(flag.decision==='redact'){
   if(flag.redactionArtifactRef===null)unresolved.push(id);
   else text(flag.redactionArtifactRef,'redaction_artifact_ref');
  }else if(flag.redactionArtifactRef!==null)throw new Error('unexpected_redaction_artifact_ref');
  if(flag.decision==='withhold')unresolved.push(id);
 }
 return {reviewReceiptRef:JSON.stringify([reviewer,at,pages,Array.from(seen).sort()]),
  unresolvedFlagIds:unresolved.sort(),reviewedOriginalPageIds:pages,
  status:'hold_for_publication_review_and_release_authorization'};
}

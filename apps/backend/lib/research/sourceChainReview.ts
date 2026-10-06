import { compareOriginalSources, type OriginalSourceIdentity } from './sourceVersion';

/** Pure source-chain triage. This never certifies independent corroboration:
 * human verification of the claimed origin, editorial independence and source
 * provenance remains outside this module. IDs are opaque synthetic-safe refs.
 */
export type SourceChainRecord = {
  source: OriginalSourceIdentity;
  upstreamRecordIds: readonly string[];
  originReviewReceiptId: string | null;
};
export type SourceChainReview = {
  disposition: 'same_content' | 'same_location_changed_content' | 'shared_upstream' | 'unverified_chain' | 'independence_review_candidate';
  provenIndependent: false;
  holdReasons: readonly string[];
};
const ids=(values:unknown):string[]=>{
 if(!Array.isArray(values)) throw new Error('invalid_upstream_record_ids');
 const normalized=values.map(value=>{
  if(typeof value!=='string'||!value.trim()) throw new Error('invalid_upstream_record_id');
  return value.trim();
 });
 if(new Set(normalized).size!==normalized.length) throw new Error('duplicate_upstream_record_id');
 return normalized;
};
const receipt=(value:unknown):string|null=>{
 if(value===null)return null;
 if(typeof value!=='string'||!value.trim())throw new Error('invalid_origin_review_receipt_id');
 return value.trim();
};
export function reviewSourceChains(a:SourceChainRecord,b:SourceChainRecord):SourceChainReview {
 const left=ids(a.upstreamRecordIds),right=ids(b.upstreamRecordIds);
 const aReceipt=receipt(a.originReviewReceiptId),bReceipt=receipt(b.originReviewReceiptId);
 const relation=compareOriginalSources(a.source,b.source);
 const result=(disposition:SourceChainReview['disposition'],holdReasons:string[]):SourceChainReview=>({
  disposition,holdReasons,provenIndependent:false,
 });
 if(relation==='same_source_version'||relation==='identical_bytes_mirrored_location'){
  return result('same_content',['identical_original_bytes_not_independent']);
 }
 if(relation==='location_changed_content'){
  return result('same_location_changed_content',['same_source_location_version_not_independent']);
 }
 if(left.some(id=>right.includes(id))){
  return result('shared_upstream',['shared_upstream_record_not_independent']);
 }
 if(!left.length||!right.length||!aReceipt||!bReceipt){
  return result('unverified_chain',['complete_origin_chain_and_review_receipts_required']);
 }
 if(aReceipt===bReceipt){
  return result('unverified_chain',['separate_origin_reviews_required']);
 }
 return result('independence_review_candidate',['human_independence_verification_required']);
}

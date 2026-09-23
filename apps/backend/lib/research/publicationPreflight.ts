/** Publication preflight is a HOLD-only gate, never an automatic PII detector.
 * A passing preflight means all declared review receipts are present, NOT that
 * a document is safe to publish. Human review and separate release authorization
 * remain mandatory; no private/victim text is accepted by this module.
 */
export type PublicationPreflight = {
  sourceRecordIds: readonly string[];
  reviewedOriginalPageIds: readonly string[];
  privacyReviewReceiptId: string | null;
  publicationReviewReceiptId: string | null;
  unresolvedPrivacyFlags: readonly string[];
  unresolvedSourceFlags: readonly string[];
};
export type PublicationPreflightResult = {
  readyForHumanReleaseDecision: boolean;
  holdReasons: readonly string[];
  sharingStatus: 'hold_for_explicit_release_authorization';
};
const clean = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`invalid_${field}`);
  return value.trim();
};
const unique = (values: unknown, field: string): string[] => {
  if (!Array.isArray(values)) throw new Error(`invalid_${field}`);
  const result = values.map((v) => clean(v, field));
  if (new Set(result).size !== result.length) throw new Error(`duplicate_${field}`);
  return result;
};
export function publicationPreflight(input: PublicationPreflight): PublicationPreflightResult {
  const sources = unique(input.sourceRecordIds, 'source_record_id');
  const pages = unique(input.reviewedOriginalPageIds, 'reviewed_original_page_id');
  const privacy = unique(input.unresolvedPrivacyFlags, 'privacy_flag');
  const provenance = unique(input.unresolvedSourceFlags, 'source_flag');
  const privacyReceipt = input.privacyReviewReceiptId === null ? null : clean(input.privacyReviewReceiptId, 'privacy_review_receipt_id');
  const publicationReceipt = input.publicationReviewReceiptId === null ? null : clean(input.publicationReviewReceiptId, 'publication_review_receipt_id');
  const holdReasons: string[] = [];
  if (!sources.length) holdReasons.push('source_required');
  if (!pages.length) holdReasons.push('original_page_review_required');
  if (!privacyReceipt) holdReasons.push('privacy_review_required');
  if (!publicationReceipt) holdReasons.push('publication_review_required');
  if (privacy.length) holdReasons.push('unresolved_privacy_flags');
  if (provenance.length) holdReasons.push('unresolved_source_flags');
  return { readyForHumanReleaseDecision: holdReasons.length === 0, holdReasons,
    sharingStatus: 'hold_for_explicit_release_authorization' };
}

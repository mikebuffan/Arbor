/** Pure, non-publication classification of research review outcomes.
 * A label is a workflow disposition, not a determination of guilt or truth.
 * Review flags must come from independently verified records upstream.
 */
export const researchFindingKinds = [
  'observation', 'conflict', 'missing_context', 'insufficient_evidence',
  'extraction_error', 'unresolved', 'finding',
] as const;
export type ResearchFindingKind = (typeof researchFindingKinds)[number];
export type ResearchFindingCandidate = {
  candidateId: string;
  kind: ResearchFindingKind;
  sourceRecordIds: readonly string[];
  counterevidenceRecordIds: readonly string[];
  explanation: string;
  independentOriginalPageReview: boolean;
  contextVerified: boolean;
  privacyReviewPassed: boolean;
  publicationReviewPassed: boolean;
};
export type ClassifiedResearchFinding = ResearchFindingCandidate & {
  reviewStatus: 'hold_for_human_review';
  sharingStatus: 'hold_for_privacy_and_source_review';
};
const required = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`invalid_${field}`);
  return value.trim();
};
const refs = (values: unknown, field: string): string[] => {
  if (!Array.isArray(values)) throw new Error(`invalid_${field}`);
  const result = values.map((value) => required(value, field));
  if (new Set(result).size !== result.length) throw new Error(`duplicate_${field}`);
  return result;
};
export function classifyResearchFinding(input: ResearchFindingCandidate): ClassifiedResearchFinding {
  if (!researchFindingKinds.includes(input?.kind)) throw new Error('invalid_research_finding_kind');
  const sourceRecordIds = refs(input.sourceRecordIds, 'source_record_id');
  const counterevidenceRecordIds = refs(input.counterevidenceRecordIds, 'counterevidence_record_id');
  if (sourceRecordIds.some((id) => counterevidenceRecordIds.includes(id))) {
    throw new Error('source_and_counterevidence_overlap');
  }
  for (const flag of ['independentOriginalPageReview', 'contextVerified', 'privacyReviewPassed', 'publicationReviewPassed'] as const) {
    if (typeof input[flag] !== 'boolean') throw new Error(`invalid_${flag}`);
  }
  if (input.kind === 'finding' && (!sourceRecordIds.length || !input.independentOriginalPageReview || !input.contextVerified)) {
    throw new Error('finding_requires_verified_source_and_context');
  }
  if (input.kind === 'conflict' && (!sourceRecordIds.length || !counterevidenceRecordIds.length)) {
    throw new Error('conflict_requires_both_sides');
  }
  if (input.kind === 'observation' && !sourceRecordIds.length) {
    throw new Error('observation_requires_source');
  }
  return {
    ...input,
    candidateId: required(input.candidateId, 'candidate_id'),
    explanation: required(input.explanation, 'explanation'),
    sourceRecordIds, counterevidenceRecordIds,
    reviewStatus: 'hold_for_human_review',
    sharingStatus: 'hold_for_privacy_and_source_review',
  };
}

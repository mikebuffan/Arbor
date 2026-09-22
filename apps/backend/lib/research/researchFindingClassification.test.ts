import { describe, expect, it } from 'vitest';
import { classifyResearchFinding, researchFindingKinds, type ResearchFindingCandidate } from './researchFindingClassification';
const candidate = (overrides: Partial<ResearchFindingCandidate> = {}): ResearchFindingCandidate => ({
  candidateId: 'synthetic-1', kind: 'unresolved', sourceRecordIds: [], counterevidenceRecordIds: [],
  explanation: 'Synthetic test only', independentOriginalPageReview: false, contextVerified: false,
  privacyReviewPassed: false, publicationReviewPassed: false, ...overrides,
});
describe('classifyResearchFinding', () => {
  it.each(researchFindingKinds)('keeps %s on review and privacy HOLD', kind => {
    const required = kind === 'finding' ? {sourceRecordIds:['source:1'], independentOriginalPageReview:true, contextVerified:true}
      : kind === 'conflict' ? {sourceRecordIds:['source:1'], counterevidenceRecordIds:['source:2']}
      : kind === 'observation' ? {sourceRecordIds:['source:1']} : {};
    const result = classifyResearchFinding(candidate({kind, ...required}));
    expect(result.reviewStatus).toBe('hold_for_human_review');
    expect(result.sharingStatus).toBe('hold_for_privacy_and_source_review');
  });
  it('refuses finding without reviewed original page, context and source', () => {
    for (const override of [{}, {sourceRecordIds:['source:1']}, {sourceRecordIds:['source:1'], independentOriginalPageReview:true}]) {
      expect(() => classifyResearchFinding(candidate({kind:'finding', ...override}))).toThrow('finding_requires_verified_source_and_context');
    }
  });
  it('does not turn a missing source into an observation or conflict', () => {
    expect(() => classifyResearchFinding(candidate({kind:'observation'}))).toThrow('observation_requires_source');
    expect(() => classifyResearchFinding(candidate({kind:'conflict',sourceRecordIds:['source:1']}))).toThrow('conflict_requires_both_sides');
  });
  it('rejects overlapping, duplicate and blank evidence references', () => {
    expect(() => classifyResearchFinding(candidate({sourceRecordIds:['a'],counterevidenceRecordIds:['a']}))).toThrow('source_and_counterevidence_overlap');
    expect(() => classifyResearchFinding(candidate({sourceRecordIds:['a','a']}))).toThrow('duplicate_source_record_id');
    expect(() => classifyResearchFinding(candidate({counterevidenceRecordIds:[' ']}))).toThrow('invalid_counterevidence_record_id');
  });
  it('rejects malformed kinds and flags rather than granting release', () => {
    expect(() => classifyResearchFinding(candidate({kind:'confirmed_crime' as never}))).toThrow('invalid_research_finding_kind');
    expect(() => classifyResearchFinding(candidate({privacyReviewPassed:'yes' as never}))).toThrow('invalid_privacyReviewPassed');
  });
  it('normalizes identifiers without mutating caller data', () => {
    const input=candidate({candidateId:' synthetic-1 ',sourceRecordIds:[' source:1 ']});
    const result=classifyResearchFinding(input);
    expect(result.candidateId).toBe('synthetic-1');
    expect(result.sourceRecordIds).toEqual(['source:1']);
    expect(input.sourceRecordIds).toEqual([' source:1 ']);
  });
});

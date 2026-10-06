import { describe, expect, it } from 'vitest';
import { dedupeResearchLeads, type ResearchLead } from './leadDedupe';

const lead = (overrides: Partial<ResearchLead> = {}): ResearchLead => ({
  leadId: 'lead-1',
  canonicalKey: 'record:alpha',
  sourceRefs: ['source:a'],
  reasons: ['timestamp conflict'],
  counterevidenceRefs: [],
  checkpointRefs: ['checkpoint:1'],
  ...overrides,
});

describe('dedupeResearchLeads', () => {
  it('merges exact canonical-key duplicates without losing provenance or counterevidence', () => {
    const result = dedupeResearchLeads([
      lead(),
      lead({
        leadId: 'lead-2',
        sourceRefs: ['source:b'],
        reasons: ['independent follow-up'],
        counterevidenceRefs: ['source:counter'],
        checkpointRefs: ['checkpoint:2'],
      }),
    ]);

    expect(result).toEqual([
      {
        leadId: 'lead-1',
        canonicalKey: 'record:alpha',
        sourceRefs: ['source:a', 'source:b'],
        reasons: ['independent follow-up', 'timestamp conflict'],
        counterevidenceRefs: ['source:counter'],
        checkpointRefs: ['checkpoint:1', 'checkpoint:2'],
        mergedLeadIds: ['lead-1', 'lead-2'],
      },
    ]);
  });

  it('does not merge similar-looking leads without an identical explicit key', () => {
    const result = dedupeResearchLeads([
      lead(),
      lead({ leadId: 'lead-2', canonicalKey: 'record:alpha-copy', sourceRefs: ['source:a'] }),
    ]);
    expect(result).toHaveLength(2);
  });

  it('deduplicates repeated references without turning mirrors into extra support', () => {
    const [result] = dedupeResearchLeads([
      lead({ sourceRefs: ['source:a', 'source:a'], reasons: ['reason', 'reason'] }),
      lead({ leadId: 'lead-2', sourceRefs: ['source:a'], reasons: ['reason'] }),
    ]);
    expect(result.sourceRefs).toEqual(['source:a']);
    expect(result.reasons).toEqual(['reason']);
    expect(result.mergedLeadIds).toEqual(['lead-1', 'lead-2']);
  });

  it('is deterministic when exact-key duplicate input order changes', () => {
    const first = lead({ leadId: 'lead-z', sourceRefs: ['source:z'], checkpointRefs: ['checkpoint:z'] });
    const second = lead({ leadId: 'lead-a', sourceRefs: ['source:a'], checkpointRefs: ['checkpoint:a'] });

    const forward = dedupeResearchLeads([first, second]);
    const reverse = dedupeResearchLeads([second, first]);

    expect(reverse).toEqual(forward);
    expect(forward[0].leadId).toBe('lead-a');
    expect(forward[0].mergedLeadIds).toEqual(['lead-a', 'lead-z']);
  });

  it('rejects duplicate lead identifiers rather than silently overwriting audit identity', () => {
    expect(() => dedupeResearchLeads([lead(), lead()])).toThrow('duplicate leadId');
  });

  it('rejects empty canonical keys and empty references', () => {
    expect(() => dedupeResearchLeads([lead({ canonicalKey: '  ' })])).toThrow('canonicalKey');
    expect(() => dedupeResearchLeads([lead({ sourceRefs: [''] })])).toThrow('sourceRefs');
  });
});

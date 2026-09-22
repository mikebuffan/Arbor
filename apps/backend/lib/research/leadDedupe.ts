export type ResearchLead = {
  leadId: string;
  canonicalKey: string;
  sourceRefs: readonly string[];
  reasons: readonly string[];
  counterevidenceRefs: readonly string[];
  checkpointRefs: readonly string[];
};

export type DedupedResearchLead = ResearchLead & {
  mergedLeadIds: readonly string[];
};

const clean = (values: readonly string[], field: string): string[] => {
  const normalized = values.map((value) => value.trim());
  if (normalized.some((value) => value.length === 0)) {
    throw new Error(`${field} contains an empty reference`);
  }
  return [...new Set(normalized)].sort();
};

const validateLead = (lead: ResearchLead): ResearchLead => {
  const leadId = lead.leadId.trim();
  const canonicalKey = lead.canonicalKey.trim();
  if (!leadId) throw new Error('leadId is required');
  if (!canonicalKey) throw new Error('canonicalKey is required');
  return {
    leadId,
    canonicalKey,
    sourceRefs: clean(lead.sourceRefs, 'sourceRefs'),
    reasons: clean(lead.reasons, 'reasons'),
    counterevidenceRefs: clean(lead.counterevidenceRefs, 'counterevidenceRefs'),
    checkpointRefs: clean(lead.checkpointRefs, 'checkpointRefs'),
  };
};

/**
 * Collapses only leads carrying the exact same explicit canonical key.
 * It never derives identity from names, URLs, text similarity, or source count.
 * All provenance, reasons, counterevidence and checkpoints survive the collapse.
 */
export function dedupeResearchLeads(leads: readonly ResearchLead[]): DedupedResearchLead[] {
  const byKey = new Map<string, DedupedResearchLead>();
  const seenLeadIds = new Set<string>();

  for (const raw of leads) {
    const lead = validateLead(raw);
    if (seenLeadIds.has(lead.leadId)) throw new Error(`duplicate leadId: ${lead.leadId}`);
    seenLeadIds.add(lead.leadId);

    const existing = byKey.get(lead.canonicalKey);
    if (!existing) {
      byKey.set(lead.canonicalKey, { ...lead, mergedLeadIds: [lead.leadId] });
      continue;
    }

    byKey.set(lead.canonicalKey, {
      ...existing,
      sourceRefs: clean([...existing.sourceRefs, ...lead.sourceRefs], 'sourceRefs'),
      reasons: clean([...existing.reasons, ...lead.reasons], 'reasons'),
      counterevidenceRefs: clean(
        [...existing.counterevidenceRefs, ...lead.counterevidenceRefs],
        'counterevidenceRefs',
      ),
      checkpointRefs: clean([...existing.checkpointRefs, ...lead.checkpointRefs], 'checkpointRefs'),
      mergedLeadIds: clean([...existing.mergedLeadIds, lead.leadId], 'mergedLeadIds'),
    });
  }

  return [...byKey.values()].sort((a, b) => a.canonicalKey.localeCompare(b.canonicalKey));
}

import {
  evaluateInvestigationIntegrity,
  type FalsificationAttempt,
  type InvestigationAssertionKind,
  type InvestigationEvidenceAtom,
  type InvestigationIntegrityDecision,
  type NegativeEvidenceState,
} from "./investigationIntegrity";

export type PersistedInvestigationFindingRequest = {
  claimId: string;
  claimText: string;
  assertionKind: InvestigationAssertionKind;
  supportEvidenceIds: string[];
  counterEvidenceRefs: string[];
  unresolvedContradictionIds: string[];
  falsificationAttempts: FalsificationAttempt[];
  negativeEvidence?: {
    state: NegativeEvidenceState;
    scope: string;
    proofRef?: string | null;
  } | null;
};

export type TrustedInvestigationEvidenceStore = {
  loadEvidence(input: {
    ownerId: string;
    projectId: string;
    evidenceIds: string[];
  }): Promise<InvestigationEvidenceAtom[]>;
};

function cleanIds(values: string[], field: string): string[] {
  if (!Array.isArray(values) || values.length === 0 || values.length > 100) {
    throw new Error("investigation_integrity_" + field + "_invalid");
  }
  const ids = values.map((value) => {
    if (typeof value !== "string" || !value.trim() || value.length > 300) {
      throw new Error("investigation_integrity_" + field + "_invalid");
    }
    return value.trim();
  });
  if (new Set(ids).size !== ids.length) {
    throw new Error("investigation_integrity_" + field + "_duplicate");
  }
  return ids;
}

export async function evaluatePersistedInvestigationFinding(input: {
  store: TrustedInvestigationEvidenceStore;
  ownerId: string;
  projectId: string;
  request: PersistedInvestigationFindingRequest;
}): Promise<InvestigationIntegrityDecision> {
  if (!input.ownerId.trim() || !input.projectId.trim()) {
    throw new Error("investigation_integrity_scope_required");
  }

  const requestedIds = cleanIds(
    input.request.supportEvidenceIds,
    "support_evidence_ids",
  );
  const loaded = await input.store.loadEvidence({
    ownerId: input.ownerId,
    projectId: input.projectId,
    evidenceIds: requestedIds,
  });

  const loadedIds = loaded.map((item) => item.id);
  if (
    loadedIds.length !== requestedIds.length ||
    new Set(loadedIds).size !== loadedIds.length ||
    requestedIds.some((id) => !loadedIds.includes(id)) ||
    loadedIds.some((id) => !requestedIds.includes(id))
  ) {
    throw new Error("investigation_integrity_persisted_evidence_mismatch");
  }

  return evaluateInvestigationIntegrity({
    claimId: input.request.claimId,
    claimText: input.request.claimText,
    assertionKind: input.request.assertionKind,
    support: loaded,
    counterEvidenceRefs: [...input.request.counterEvidenceRefs],
    unresolvedContradictionIds: [
      ...input.request.unresolvedContradictionIds,
    ],
    falsificationAttempts: input.request.falsificationAttempts.map(
      (attempt) => ({
        ...attempt,
        evidenceRefs: [...attempt.evidenceRefs],
      }),
    ),
    negativeEvidence: input.request.negativeEvidence
      ? { ...input.request.negativeEvidence }
      : null,
  });
}

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
};

export type PersistedInvestigationFindingContext = {
  claimId: string;
  claimText: string;
  assertionKind: InvestigationAssertionKind;
  support: InvestigationEvidenceAtom[];
  counterEvidenceRefs: string[];
  unresolvedContradictionIds: string[];
  falsificationAttempts: FalsificationAttempt[];
  negativeEvidence?: {
    state: NegativeEvidenceState;
    scope: string;
    proofRef?: string | null;
  } | null;
};

export type TrustedInvestigationFindingStore = {
  loadFindingContext(input: {
    ownerId: string;
    projectId: string;
    claimId: string;
  }): Promise<PersistedInvestigationFindingContext | null>;
};

function requiredText(value: string, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("investigation_integrity_" + field + "_required");
  }
  return value.trim();
}

/**
 * Finding promotion never accepts evidence, contradiction state, counterevidence,
 * falsification receipts or absence semantics from planner/model payloads.
 * The planner can name only a persisted claim ID. The trusted owner/project
 * store must return the complete current context for that claim.
 */
export async function evaluatePersistedInvestigationFinding(input: {
  store: TrustedInvestigationFindingStore;
  ownerId: string;
  projectId: string;
  request: PersistedInvestigationFindingRequest;
}): Promise<InvestigationIntegrityDecision> {
  const ownerId = requiredText(input.ownerId, "owner_id", 300);
  const projectId = requiredText(input.projectId, "project_id", 300);
  const claimId = requiredText(input.request.claimId, "claim_id", 300);

  const persisted = await input.store.loadFindingContext({
    ownerId,
    projectId,
    claimId,
  });

  if (!persisted) {
    throw new Error("investigation_integrity_persisted_claim_not_found");
  }
  if (persisted.claimId !== claimId) {
    throw new Error("investigation_integrity_persisted_claim_mismatch");
  }

  return evaluateInvestigationIntegrity({
    claimId: persisted.claimId,
    claimText: persisted.claimText,
    assertionKind: persisted.assertionKind,
    support: persisted.support,
    counterEvidenceRefs: [...persisted.counterEvidenceRefs],
    unresolvedContradictionIds: [
      ...persisted.unresolvedContradictionIds,
    ],
    falsificationAttempts: persisted.falsificationAttempts.map(
      (attempt) => ({
        ...attempt,
        evidenceRefs: [...attempt.evidenceRefs],
      }),
    ),
    negativeEvidence: persisted.negativeEvidence
      ? { ...persisted.negativeEvidence }
      : null,
  });
}

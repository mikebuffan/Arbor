import {
  INVESTIGATION_ASSERTION_KINDS,
  type FalsificationAttempt,
  type InvestigationAssertionKind,
  type NegativeEvidenceState,
} from "./investigationIntegrity";
import {
  evaluatePersistedInvestigationFinding,
  type PersistedInvestigationFindingRequest,
  type TrustedInvestigationEvidenceStore,
} from "./investigationIntegrityStore";
import type { ResearchUnitHandler } from "./researchUnitDispatcher";

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("investigation_integrity_unit_invalid_" + field);
  }
  return value as Record<string, unknown>;
}

function requiredText(
  value: unknown,
  field: string,
  max = 4000,
): string {
  if (typeof value !== "string") {
    throw new Error("investigation_integrity_unit_invalid_" + field);
  }
  const clean = value.trim();
  if (!clean || clean.length > max) {
    throw new Error("investigation_integrity_unit_invalid_" + field);
  }
  return clean;
}

function stringArray(
  value: unknown,
  field: string,
  allowEmpty = true,
): string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) ||
      value.length > 100) {
    throw new Error("investigation_integrity_unit_invalid_" + field);
  }
  const out = value.map((item) => requiredText(item, field, 300));
  if (new Set(out).size !== out.length) {
    throw new Error("investigation_integrity_unit_duplicate_" + field);
  }
  return out;
}

function assertionKind(value: unknown): InvestigationAssertionKind {
  const kind = requiredText(value, "assertion_kind", 100);
  if (!INVESTIGATION_ASSERTION_KINDS.includes(
    kind as InvestigationAssertionKind,
  )) {
    throw new Error("investigation_integrity_unit_invalid_assertion_kind");
  }
  return kind as InvestigationAssertionKind;
}

function falsificationAttempts(value: unknown): FalsificationAttempt[] {
  if (!Array.isArray(value) || value.length > 50) {
    throw new Error(
      "investigation_integrity_unit_invalid_falsification_attempts",
    );
  }
  return value.map((raw) => {
    const r = object(raw, "falsification_attempt");
    const result = requiredText(
      r.result,
      "falsification_result",
      30,
    );
    if (!["survived", "failed", "inconclusive"].includes(result)) {
      throw new Error(
        "investigation_integrity_unit_invalid_falsification_result",
      );
    }
    return {
      id: requiredText(r.id, "falsification_id", 300),
      hypothesis: requiredText(
        r.hypothesis,
        "falsification_hypothesis",
        4000,
      ),
      result: result as FalsificationAttempt["result"],
      evidenceRefs: stringArray(
        r.evidenceRefs,
        "falsification_evidence_refs",
      ),
    };
  });
}

function negativeEvidence(
  value: unknown,
): PersistedInvestigationFindingRequest["negativeEvidence"] {
  if (value === null || value === undefined) return null;
  const r = object(value, "negative_evidence");
  const state = requiredText(r.state, "negative_evidence_state", 100);
  const allowed: NegativeEvidenceState[] = [
    "NOT_FOUND_IN_SEARCHED_SCOPE",
    "SOURCE_SILENT",
    "EXPECTED_BUT_MISSING",
    "PROVEN_ABSENT",
  ];
  if (!allowed.includes(state as NegativeEvidenceState)) {
    throw new Error(
      "investigation_integrity_unit_invalid_negative_evidence_state",
    );
  }
  return {
    state: state as NegativeEvidenceState,
    scope: requiredText(r.scope, "negative_evidence_scope", 4000),
    proofRef:
      r.proofRef === null || r.proofRef === undefined
        ? null
        : requiredText(r.proofRef, "negative_evidence_proof_ref", 300),
  };
}

export function parsePersistedInvestigationFindingRequest(
  value: unknown,
): PersistedInvestigationFindingRequest {
  const r = object(value, "request");
  return {
    claimId: requiredText(r.claimId, "claim_id", 300),
    claimText: requiredText(r.claimText, "claim_text", 8000),
    assertionKind: assertionKind(r.assertionKind),
    supportEvidenceIds: stringArray(
      r.supportEvidenceIds,
      "support_evidence_ids",
      false,
    ),
    counterEvidenceRefs: stringArray(
      r.counterEvidenceRefs ?? [],
      "counter_evidence_refs",
    ),
    unresolvedContradictionIds: stringArray(
      r.unresolvedContradictionIds ?? [],
      "unresolved_contradiction_ids",
    ),
    falsificationAttempts: falsificationAttempts(
      r.falsificationAttempts ?? [],
    ),
    negativeEvidence: negativeEvidence(r.negativeEvidence),
  };
}

function referencedEvidence(
  request: PersistedInvestigationFindingRequest,
): string[] {
  return Array.from(new Set([
    ...request.supportEvidenceIds,
    ...request.counterEvidenceRefs,
    ...request.falsificationAttempts.flatMap(
      (attempt) => attempt.evidenceRefs,
    ),
    ...(request.negativeEvidence?.proofRef
      ? [request.negativeEvidence.proofRef]
      : []),
  ])).slice(0, 100);
}

export function buildInvestigationIntegrityUnitHandler(
  store: TrustedInvestigationEvidenceStore,
): ResearchUnitHandler {
  return async ({ session, claim, at }) => {
    const request = parsePersistedInvestigationFindingRequest(
      claim.payload.request,
    );

    const decision = await evaluatePersistedInvestigationFinding({
      store,
      ownerId: session.userId,
      projectId: session.projectId,
      request,
    });

    const passed = decision.status === "promotable";
    return {
      sessionId: session.id,
      unitId: claim.unitId,
      idempotencyKey: claim.idempotencyKey,
      status: passed ? "completed" : "blocked",
      recordedAt: at,
      costCents: 0,
      evidenceRefs: referencedEvidence(request),
      unresolvedRequiredWork: passed
        ? Math.max(0, session.unresolvedRequiredWork - 1)
        : session.unresolvedRequiredWork,
      result: {
        investigationIntegrityStatus: decision.status,
        integrityReasons: decision.reasons,
        independentLineages: decision.independentLineages,
        primarySourceLeads: decision.primarySourceLeads,
        findingIntegrityPassed: passed,
        independentlyVerifiedFinding: false,
      },
    };
  };
}

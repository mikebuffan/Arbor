import {
  evaluatePersistedInvestigationFinding,
  type PersistedInvestigationFindingRequest,
  type TrustedInvestigationFindingStore,
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

export function parsePersistedInvestigationFindingRequest(
  value: unknown,
): PersistedInvestigationFindingRequest {
  const r = object(value, "request");
  const keys = Object.keys(r).sort();
  if (keys.length !== 1 || keys[0] !== "claimId") {
    throw new Error("investigation_integrity_unit_request_must_reference_claim_only");
  }
  return {
    claimId: requiredText(r.claimId, "claim_id", 300),
  };
}

export function buildInvestigationIntegrityUnitHandler(
  store: TrustedInvestigationFindingStore,
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
      evidenceRefs: ["investigation-claim:" + request.claimId],
      unresolvedRequiredWork: passed
        ? Math.max(0, session.unresolvedRequiredWork - 1)
        : session.unresolvedRequiredWork,
      result: {
        persistedClaimId: request.claimId,
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

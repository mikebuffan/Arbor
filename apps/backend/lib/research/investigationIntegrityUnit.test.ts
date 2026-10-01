import { describe, expect, it, vi } from "vitest";
import type { InvestigationEvidenceAtom } from "./investigationIntegrity";
import type { ResearchSession } from "./sessionPolicy";
import type { ResearchClaim } from "./sessionRunner";
import {
  buildInvestigationIntegrityUnitHandler,
  parsePersistedInvestigationFindingRequest,
} from "./investigationIntegrityUnit";
import type { TrustedInvestigationEvidenceStore } from "./investigationIntegrityStore";

const AT = "2026-09-30T23:00:00.000Z";

const session: ResearchSession = {
  id: "session-1",
  userId: "owner-1",
  projectId: "project-1",
  objective: "Synthetic integrity gate.",
  status: "running",
  startedAt: "2026-09-30T22:00:00.000Z",
  deadlineAt: "2026-10-01T01:00:00.000Z",
  maxWorkUnits: 20,
  consumedWorkUnits: 1,
  maxCostCents: 100,
  committedCostCents: 0,
  authorized: true,
  cancellationRequested: false,
  unresolvedRequiredWork: 2,
  completedEvidenceRefs: [],
};

function evidence(): InvestigationEvidenceAtom {
  return {
    id: "evidence-1",
    evidenceClass: "PRIMARY_RECORD",
    sourceRef: "court:record-1",
    lineageKey: "court:record-1",
    content: "Synthetic primary record.",
    supports: ["established_act"],
  };
}

function claim(request: Record<string, unknown>): ResearchClaim {
  return {
    unitId: "unit-1",
    leaseToken: "lease-1",
    idempotencyKey: "integrity-1",
    kind: "research.integrity_gate",
    payload: { request },
    maxCostReservationCents: 0,
  };
}

function validRequest() {
  return {
    claimId: "claim-1",
    claimText: "Synthetic act occurred.",
    assertionKind: "established_act",
    supportEvidenceIds: ["evidence-1"],
    counterEvidenceRefs: [],
    unresolvedContradictionIds: [],
    falsificationAttempts: [{
      id: "break-1",
      hypothesis: "The act did not occur.",
      result: "survived",
      evidenceRefs: ["counter-check-1"],
    }],
    negativeEvidence: null,
  };
}

describe("investigation integrity research unit", () => {
  it("parses only the bounded integrity request shape", () => {
    expect(parsePersistedInvestigationFindingRequest(validRequest()))
      .toMatchObject({
        claimId: "claim-1",
        assertionKind: "established_act",
        supportEvidenceIds: ["evidence-1"],
      });

    expect(() => parsePersistedInvestigationFindingRequest({
      ...validRequest(),
      supportEvidenceIds: [],
    })).toThrow(
      "investigation_integrity_unit_invalid_support_evidence_ids",
    );
  });

  it("completes a gate pass without claiming independent verification", async () => {
    const store: TrustedInvestigationEvidenceStore = {
      loadEvidence: vi.fn(async () => [evidence()]),
    };
    const handler = buildInvestigationIntegrityUnitHandler(store);
    const receipt = await handler({
      session,
      claim: claim(validRequest()),
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: AT,
    });

    expect(receipt).toMatchObject({
      status: "completed",
      unresolvedRequiredWork: 1,
      result: {
        investigationIntegrityStatus: "promotable",
        findingIntegrityPassed: true,
        independentlyVerifiedFinding: false,
      },
    });
  });

  it("blocks rather than smoothing over an unresolved contradiction", async () => {
    const store: TrustedInvestigationEvidenceStore = {
      loadEvidence: vi.fn(async () => [evidence()]),
    };
    const handler = buildInvestigationIntegrityUnitHandler(store);
    const receipt = await handler({
      session,
      claim: claim({
        ...validRequest(),
        unresolvedContradictionIds: ["contradiction-1"],
      }),
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: AT,
    });

    expect(receipt).toMatchObject({
      status: "blocked",
      unresolvedRequiredWork: 2,
      result: {
        investigationIntegrityStatus: "hold",
        findingIntegrityPassed: false,
        integrityReasons: ["unresolved_contradictions_present"],
        independentlyVerifiedFinding: false,
      },
    });
  });

  it("derives owner and project from the trusted session, not from payload text", async () => {
    const store: TrustedInvestigationEvidenceStore = {
      loadEvidence: vi.fn(async (input) => {
        expect(input.ownerId).toBe("owner-1");
        expect(input.projectId).toBe("project-1");
        return [evidence()];
      }),
    };
    const handler = buildInvestigationIntegrityUnitHandler(store);
    await handler({
      session,
      claim: claim({
        ...validRequest(),
        ownerId: "spoofed-owner",
        projectId: "spoofed-project",
      }),
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: AT,
    });

    expect(store.loadEvidence).toHaveBeenCalledOnce();
  });
});

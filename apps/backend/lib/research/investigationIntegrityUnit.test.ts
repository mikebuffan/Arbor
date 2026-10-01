import { describe, expect, it, vi } from "vitest";
import type { InvestigationEvidenceAtom } from "./investigationIntegrity";
import type { ResearchSession } from "./sessionPolicy";
import type { ResearchClaim } from "./sessionRunner";
import {
  buildInvestigationIntegrityUnitHandler,
  parsePersistedInvestigationFindingRequest,
} from "./investigationIntegrityUnit";
import type {
  PersistedInvestigationFindingContext,
  TrustedInvestigationFindingStore,
} from "./investigationIntegrityStore";

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
    contentSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    supports: ["established_act"],
  };
}

function persistedContext(
  overrides: Partial<PersistedInvestigationFindingContext> = {},
): PersistedInvestigationFindingContext {
  return {
    claimId: "claim-1",
    claimText: "Synthetic act occurred.",
    assertionKind: "established_act",
    support: [evidence()],
    counterEvidenceRefs: [],
    unresolvedContradictionIds: [],
    falsificationAttempts: [{
      id: "break-1",
      hypothesis: "The act did not occur.",
      result: "survived",
      evidenceRefs: ["counter-check-1"],
    }],
    negativeEvidence: null,
    ...overrides,
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

describe("investigation integrity research unit", () => {
  it("accepts only a persisted claim id from planner payload", () => {
    expect(parsePersistedInvestigationFindingRequest({
      claimId: "claim-1",
    })).toEqual({ claimId: "claim-1" });

    expect(() => parsePersistedInvestigationFindingRequest({
      claimId: "claim-1",
      support: [evidence()],
    })).toThrow(
      "investigation_integrity_unit_request_must_reference_claim_only",
    );
  });

  it("completes a gate pass without claiming independent verification", async () => {
    const store: TrustedInvestigationFindingStore = {
      loadFindingContext: vi.fn(async () => persistedContext()),
    };
    const handler = buildInvestigationIntegrityUnitHandler(store);
    const receipt = await handler({
      session,
      claim: claim({ claimId: "claim-1" }),
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: AT,
    });

    expect(receipt).toMatchObject({
      status: "completed",
      evidenceRefs: ["investigation-claim:claim-1"],
      unresolvedRequiredWork: 1,
      result: {
        persistedClaimId: "claim-1",
        investigationIntegrityStatus: "promotable",
        findingIntegrityPassed: true,
        independentlyVerifiedFinding: false,
      },
    });
  });

  it("blocks rather than smoothing over a persisted contradiction", async () => {
    const store: TrustedInvestigationFindingStore = {
      loadFindingContext: vi.fn(async () => persistedContext({
        unresolvedContradictionIds: ["contradiction-1"],
      })),
    };
    const handler = buildInvestigationIntegrityUnitHandler(store);
    const receipt = await handler({
      session,
      claim: claim({ claimId: "claim-1" }),
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

  it("derives owner/project scope from the trusted session", async () => {
    const store: TrustedInvestigationFindingStore = {
      loadFindingContext: vi.fn(async (input) => {
        expect(input).toEqual({
          ownerId: "owner-1",
          projectId: "project-1",
          claimId: "claim-1",
        });
        return persistedContext();
      }),
    };
    const handler = buildInvestigationIntegrityUnitHandler(store);
    await handler({
      session,
      claim: claim({ claimId: "claim-1" }),
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: AT,
    });

    expect(store.loadFindingContext).toHaveBeenCalledOnce();
  });
});

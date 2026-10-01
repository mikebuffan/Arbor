import { describe, expect, it, vi } from "vitest";
import type { InvestigationEvidenceAtom } from "./investigationIntegrity";
import {
  evaluatePersistedInvestigationFinding,
  type PersistedInvestigationFindingContext,
  type TrustedInvestigationFindingStore,
} from "./investigationIntegrityStore";

function storedEvidence(): InvestigationEvidenceAtom {
  return {
    id: "persisted-1",
    evidenceClass: "PRIMARY_RECORD",
    sourceRef: "court:exhibit-1",
    lineageKey: "court:exhibit-1",
    content: "Synthetic persisted primary record.",
    contentSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    supports: ["established_act"],
  };
}

function context(
  overrides: Partial<PersistedInvestigationFindingContext> = {},
): PersistedInvestigationFindingContext {
  return {
    claimId: "claim-1",
    claimText: "Synthetic act occurred.",
    assertionKind: "established_act",
    support: [storedEvidence()],
    counterEvidenceRefs: [],
    unresolvedContradictionIds: [],
    falsificationAttempts: [{
      id: "break-1",
      hypothesis: "The act did not occur.",
      result: "claim_survived",
      evidenceRefs: ["persisted-counter-check"],
    }],
    negativeEvidence: null,
    ...overrides,
  };
}

describe("trusted persisted investigation integrity evaluation", () => {
  it("loads the full finding context from trusted persistence", async () => {
    const store: TrustedInvestigationFindingStore = {
      loadFindingContext: vi.fn(async (input) => {
        expect(input).toEqual({
          ownerId: "owner-1",
          projectId: "project-1",
          claimId: "claim-1",
        });
        return context();
      }),
    };

    await expect(evaluatePersistedInvestigationFinding({
      store,
      ownerId: "owner-1",
      projectId: "project-1",
      request: { claimId: "claim-1" },
    })).resolves.toMatchObject({
      status: "promotable",
      independentLineages: 1,
    });
  });

  it("fails closed when the trusted store cannot resolve the claim", async () => {
    const store: TrustedInvestigationFindingStore = {
      loadFindingContext: vi.fn(async () => null),
    };

    await expect(evaluatePersistedInvestigationFinding({
      store,
      ownerId: "owner-1",
      projectId: "project-1",
      request: { claimId: "claim-1" },
    })).rejects.toThrow(
      "investigation_integrity_persisted_claim_not_found",
    );
  });

  it("fails closed when persistence returns a different claim id", async () => {
    const store: TrustedInvestigationFindingStore = {
      loadFindingContext: vi.fn(async () => context({
        claimId: "other-claim",
      })),
    };

    await expect(evaluatePersistedInvestigationFinding({
      store,
      ownerId: "owner-1",
      projectId: "project-1",
      request: { claimId: "claim-1" },
    })).rejects.toThrow(
      "investigation_integrity_persisted_claim_mismatch",
    );
  });

  it("preserves trusted contradictions and counterevidence from persistence", async () => {
    const store: TrustedInvestigationFindingStore = {
      loadFindingContext: vi.fn(async () => context({
        unresolvedContradictionIds: ["contradiction-1"],
        counterEvidenceRefs: ["counter-1"],
        falsificationAttempts: [{
          id: "break-other",
          hypothesis: "Different challenge.",
          result: "claim_survived",
          evidenceRefs: ["different-evidence"],
        }],
      })),
    };

    await expect(evaluatePersistedInvestigationFinding({
      store,
      ownerId: "owner-1",
      projectId: "project-1",
      request: { claimId: "claim-1" },
    })).resolves.toMatchObject({
      status: "hold",
      reasons: expect.arrayContaining([
        "unresolved_contradictions_present",
        "counterevidence_requires_explicit_resolution",
      ]),
    });
  });
});

import { describe, expect, it, vi } from "vitest";
import type { InvestigationEvidenceAtom } from "./investigationIntegrity";
import {
  evaluatePersistedInvestigationFinding,
  type PersistedInvestigationFindingRequest,
  type TrustedInvestigationEvidenceStore,
} from "./investigationIntegrityStore";

function storedEvidence(): InvestigationEvidenceAtom {
  return {
    id: "persisted-1",
    evidenceClass: "PRIMARY_RECORD",
    sourceRef: "court:exhibit-1",
    lineageKey: "court:exhibit-1",
    content: "Synthetic persisted primary record.",
    supports: ["established_act"],
  };
}

function request(
  overrides: Partial<PersistedInvestigationFindingRequest> = {},
): PersistedInvestigationFindingRequest {
  return {
    claimId: "claim-1",
    claimText: "Synthetic act occurred.",
    assertionKind: "established_act",
    supportEvidenceIds: ["persisted-1"],
    counterEvidenceRefs: [],
    unresolvedContradictionIds: [],
    falsificationAttempts: [{
      id: "break-1",
      hypothesis: "The act did not occur.",
      result: "survived",
      evidenceRefs: ["persisted-counter-check"],
    }],
    negativeEvidence: null,
    ...overrides,
  };
}

describe("trusted persisted investigation integrity evaluation", () => {
  it("loads support from trusted persistence instead of accepting model-supplied evidence objects", async () => {
    const store: TrustedInvestigationEvidenceStore = {
      loadEvidence: vi.fn(async (input) => {
        expect(input).toEqual({
          ownerId: "owner-1",
          projectId: "project-1",
          evidenceIds: ["persisted-1"],
        });
        return [storedEvidence()];
      }),
    };

    await expect(evaluatePersistedInvestigationFinding({
      store,
      ownerId: "owner-1",
      projectId: "project-1",
      request: request(),
    })).resolves.toMatchObject({
      status: "promotable",
      independentLineages: 1,
    });
  });

  it("fails closed when trusted persistence cannot return every requested evidence id", async () => {
    const store: TrustedInvestigationEvidenceStore = {
      loadEvidence: vi.fn(async () => []),
    };

    await expect(evaluatePersistedInvestigationFinding({
      store,
      ownerId: "owner-1",
      projectId: "project-1",
      request: request(),
    })).rejects.toThrow(
      "investigation_integrity_persisted_evidence_mismatch",
    );
  });

  it("fails closed when persistence returns an unexpected evidence object", async () => {
    const store: TrustedInvestigationEvidenceStore = {
      loadEvidence: vi.fn(async () => [{
        ...storedEvidence(),
        id: "not-requested",
      }]),
    };

    await expect(evaluatePersistedInvestigationFinding({
      store,
      ownerId: "owner-1",
      projectId: "project-1",
      request: request(),
    })).rejects.toThrow(
      "investigation_integrity_persisted_evidence_mismatch",
    );
  });

  it("preserves a HOLD returned by the integrity gate", async () => {
    const store: TrustedInvestigationEvidenceStore = {
      loadEvidence: vi.fn(async () => [storedEvidence()]),
    };

    await expect(evaluatePersistedInvestigationFinding({
      store,
      ownerId: "owner-1",
      projectId: "project-1",
      request: request({
        unresolvedContradictionIds: ["contradiction-1"],
      }),
    })).resolves.toMatchObject({
      status: "hold",
      reasons: ["unresolved_contradictions_present"],
    });
  });
});

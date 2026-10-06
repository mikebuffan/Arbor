import { describe, expect, it, vi } from "vitest";
import type { ResearchSession } from "./sessionPolicy";
import type { ResearchClaim } from "./sessionRunner";
import {
  buildInvestigationCaseworkUnitHandler,
  type TrustedInvestigationCaseworkStore,
} from "./investigationCaseworkUnit";

const session: ResearchSession = {
  id: "session-1",
  userId: "owner-1",
  projectId: "project-1",
  objective: "Synthetic casework.",
  status: "running",
  startedAt: "2026-09-30T20:00:00.000Z",
  deadlineAt: "2026-10-01T00:00:00.000Z",
  maxWorkUnits: 20,
  consumedWorkUnits: 2,
  maxCostCents: 100,
  committedCostCents: 0,
  authorized: true,
  cancellationRequested: false,
  unresolvedRequiredWork: 3,
  completedEvidenceRefs: ["evidence:a", "evidence:b", "map:route"],
};

const claim: ResearchClaim = {
  unitId: "casework-unit",
  leaseToken: "lease-1",
  idempotencyKey: "casework-packet-1",
  kind: "research.casework",
  payload: {
    packetId: "packet-1",
    ownerId: "spoofed-owner",
    projectId: "spoofed-project",
  },
  maxCostReservationCents: 0,
};

describe("trusted investigation casework unit", () => {
  it("loads structured casework from trusted owner/project persistence rather than planner facts", async () => {
    const store: TrustedInvestigationCaseworkStore = {
      loadPacket: vi.fn(async (input) => {
        expect(input).toEqual({
          ownerId: "owner-1",
          projectId: "project-1",
          packetId: "packet-1",
        });
        return {
          id: "packet-1",
          kind: "temporal_constraints" as const,
          evidenceRefs: ["evidence:a", "evidence:b", "map:route"],
          payload: {
            windows: [
              {
                id: "a",
                earliestAt: "2026-01-01T10:00:00Z",
                latestAt: "2026-01-01T10:05:00Z",
                evidenceRefs: ["evidence:a"],
              },
              {
                id: "b",
                earliestAt: "2026-01-01T10:20:00Z",
                latestAt: "2026-01-01T10:25:00Z",
                evidenceRefs: ["evidence:b"],
              },
            ],
            constraints: [{
              id: "travel",
              fromWindowId: "a",
              toWindowId: "b",
              minimumGapMs: 30 * 60 * 1000,
              rationale: "Synthetic route minimum.",
              evidenceRefs: ["map:route"],
            }],
          },
        };
      }),
    };

    const handler = buildInvestigationCaseworkUnitHandler(store);
    const receipt = await handler({
      session,
      claim,
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: "2026-09-30T22:00:00.000Z",
    });

    expect(receipt).toMatchObject({
      status: "completed",
      unresolvedRequiredWork: 2,
      result: {
        caseworkPacketId: "packet-1",
        caseworkKind: "temporal_constraints",
        independentlyVerifiedFinding: false,
      },
    });
    expect((receipt.result as any).caseworkOutput[0].status)
      .toBe("hard_conflict");
  });

  it("rejects trusted packets that cite evidence outside the persisted session evidence set", async () => {
    const store: TrustedInvestigationCaseworkStore = {
      loadPacket: vi.fn(async () => ({
        id: "packet-1",
        kind: "missing_function" as const,
        evidenceRefs: ["evidence:not-completed"],
        payload: {
          id: "gap",
          upstreamEntityIds: ["a"],
          downstreamEntityIds: ["b"],
          observedTransition: "A to B",
          requiredCapabilities: ["relay"],
          evidenceRefs: ["evidence:not-completed"],
          lineageKeys: ["lineage:1"],
        },
      })),
    };

    const handler = buildInvestigationCaseworkUnitHandler(store);
    await expect(handler({
      session,
      claim,
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: "2026-09-30T22:00:00.000Z",
    })).rejects.toThrow(
      "investigation_casework_untrusted_packet_evidence",
    );
  });

  it("fails closed when the trusted store returns a different packet id", async () => {
    const store: TrustedInvestigationCaseworkStore = {
      loadPacket: vi.fn(async () => ({
        id: "different",
        kind: "evidence_temperature" as const,
        evidenceRefs: ["evidence:a"],
        payload: {
          items: [{
            evidenceRef: "evidence:a",
            sourceClass: "primary_record" as const,
            eventAt: "2026-01-01T00:00:00Z",
            sourceCreatedAt: "2026-01-01T00:00:00Z",
          }],
        },
      })),
    };

    const handler = buildInvestigationCaseworkUnitHandler(store);
    await expect(handler({
      session,
      claim,
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: "2026-09-30T22:00:00.000Z",
    })).rejects.toThrow("investigation_casework_packet_mismatch");
  });
});

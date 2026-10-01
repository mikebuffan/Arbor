import { describe, expect, it, vi } from "vitest";
import type { ResearchSession } from "./sessionPolicy";
import type { ResearchClaim } from "./sessionRunner";
import {
  buildInvestigationDiscoveryUnitHandler,
  type TrustedInvestigationObservationStore,
} from "./investigationDiscoveryUnit";

const session: ResearchSession = {
  id: "session-1",
  userId: "owner-1",
  projectId: "project-1",
  objective: "Synthetic discovery.",
  status: "running",
  startedAt: "2026-09-30T20:00:00.000Z",
  deadlineAt: "2026-09-30T23:00:00.000Z",
  maxWorkUnits: 20,
  consumedWorkUnits: 1,
  maxCostCents: 100,
  committedCostCents: 0,
  authorized: true,
  cancellationRequested: false,
  unresolvedRequiredWork: 2,
  completedEvidenceRefs: [],
};

const claim: ResearchClaim = {
  unitId: "unit-1",
  leaseToken: "lease-1",
  idempotencyKey: "discovery-1",
  kind: "research.discovery",
  payload: {
    evidenceRefs: ["e1", "e2", "e3"],
  },
  maxCostReservationCents: 0,
};

function observations() {
  const entity = {
    id: "entity:bridge",
    label: "Bridge Entity",
    kind: "company" as const,
  };
  return [
    {
      evidenceRef: "e1",
      lineageKey: "lineage:a",
      documentFamily: "calendar",
      occurredAt: "2026-01-01T10:00:00Z",
      entities: [entity],
      eventTags: ["scheduled"],
    },
    {
      evidenceRef: "e2",
      lineageKey: "lineage:b",
      documentFamily: "payment",
      occurredAt: "2026-01-02T10:00:00Z",
      entities: [entity],
      eventTags: ["payment"],
    },
    {
      evidenceRef: "e3",
      lineageKey: "lineage:c",
      documentFamily: "property",
      occurredAt: "2026-01-03T10:00:00Z",
      entities: [entity],
      eventTags: ["ownership"],
    },
  ];
}

describe("trusted investigation discovery unit", () => {
  it("loads observations from trusted owner/project scope and returns hypothesis leads, not findings", async () => {
    const store: TrustedInvestigationObservationStore = {
      loadObservations: vi.fn(async (input) => {
        expect(input).toEqual({
          ownerId: "owner-1",
          projectId: "project-1",
          evidenceRefs: ["e1", "e2", "e3"],
        });
        return observations();
      }),
    };
    const handler = buildInvestigationDiscoveryUnitHandler(store);
    const receipt = await handler({
      session,
      claim,
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: "2026-09-30T21:00:00.000Z",
    });

    expect(receipt.status).toBe("completed");
    expect(receipt.result).toMatchObject({
      observedLineageCount: 3,
      observedDocumentFamilyCount: 3,
      independentlyVerifiedFinding: false,
    });
    const leads = (receipt.result as any).discoveryLeads;
    expect(leads.some((lead: any) =>
      lead.kind === "bridge_node" &&
      lead.status === "hypothesis"
    )).toBe(true);
  });

  it("fails closed if trusted persistence omits a requested evidence observation", async () => {
    const store: TrustedInvestigationObservationStore = {
      loadObservations: vi.fn(async () => observations().slice(0, 2)),
    };
    const handler = buildInvestigationDiscoveryUnitHandler(store);

    await expect(handler({
      session,
      claim,
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: "2026-09-30T21:00:00.000Z",
    })).rejects.toThrow(
      "investigation_discovery_persisted_observation_mismatch",
    );
  });

  it("ignores spoofed owner/project text because scope comes from the trusted session", async () => {
    const store: TrustedInvestigationObservationStore = {
      loadObservations: vi.fn(async (input) => {
        expect(input.ownerId).toBe("owner-1");
        expect(input.projectId).toBe("project-1");
        return observations();
      }),
    };
    const handler = buildInvestigationDiscoveryUnitHandler(store);

    await handler({
      session,
      claim: {
        ...claim,
        payload: {
          ...claim.payload,
          ownerId: "spoofed-owner",
          projectId: "spoofed-project",
        },
      },
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: "2026-09-30T21:00:00.000Z",
    });

    expect(store.loadObservations).toHaveBeenCalledOnce();
  });

  it("can turn a working hypothesis into an expected-footprint search gap without claiming absence", async () => {
    const store: TrustedInvestigationObservationStore = {
      loadObservations: vi.fn(async () => observations()),
    };
    const handler = buildInvestigationDiscoveryUnitHandler(store);
    const receipt = await handler({
      session,
      claim: {
        ...claim,
        payload: {
          evidenceRefs: ["e1", "e2", "e3"],
          expectations: [{
            hypothesisKey: "shared-event",
            description: "The three records reflect one shared event",
            expectedDocumentFamilies: [
              "calendar",
              "payment",
              "property",
              "travel",
            ],
            expectedEventTags: ["scheduled", "arrival"],
            relatedEntityIds: ["entity:bridge"],
          }],
        },
      },
      remainingMs: 60_000,
      remainingCostCents: 0,
      at: "2026-09-30T21:00:00.000Z",
    });

    const leads = (receipt.result as any).discoveryLeads;
    const gap = leads.find((lead: any) =>
      lead.kind === "expected_footprint_gap");
    expect(gap.rationale).toContain(
      "search lead, not proof of absence",
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  aggregateInvestigationFriction,
  type InvestigationFrictionSignal,
} from "./investigationFriction";

function signal(
  overrides: Partial<InvestigationFrictionSignal> = {},
): InvestigationFrictionSignal {
  return {
    id: "signal-1",
    entityIds: ["entity:a"],
    dimension: "chronology",
    description: "Synthetic chronology tension.",
    evidenceRefs: ["evidence:1"],
    lineageKeys: ["lineage:1"],
    occurredAt: "2026-01-01T00:00:00Z",
    status: "unresolved",
    ...overrides,
  };
}

describe("investigation friction accumulation", () => {
  it("promotes a multi-dimensional multi-lineage anomaly cluster to a research priority without implying misconduct", () => {
    const clusters = aggregateInvestigationFriction({
      signals: [
        signal(),
        signal({
          id: "signal-2",
          dimension: "ownership",
          evidenceRefs: ["evidence:2"],
          lineageKeys: ["lineage:2"],
          occurredAt: "2026-01-02T00:00:00Z",
        }),
        signal({
          id: "signal-3",
          dimension: "procedural",
          evidenceRefs: ["evidence:3"],
          lineageKeys: ["lineage:3"],
          occurredAt: "2026-01-03T00:00:00Z",
        }),
      ],
    });

    expect(clusters[0]).toMatchObject({
      entityId: "entity:a",
      status: "friction_cluster",
      dimensions: ["chronology", "ownership", "procedural"],
      independentLineages: ["lineage:1", "lineage:2", "lineage:3"],
    });
    expect(clusters[0].note).toContain("does not imply misconduct");
    expect(clusters[0].nextQuestions.length).toBeGreaterThan(0);
  });

  it("does not elevate many anomalies copied through one source lineage", () => {
    const clusters = aggregateInvestigationFriction({
      signals: [
        signal(),
        signal({
          id: "signal-2",
          dimension: "ownership",
          evidenceRefs: ["evidence:2"],
          lineageKeys: ["lineage:1"],
        }),
        signal({
          id: "signal-3",
          dimension: "procedural",
          evidenceRefs: ["evidence:3"],
          lineageKeys: ["lineage:1"],
        }),
      ],
    });

    expect(clusters[0].status).toBe("background_noise");
    expect(clusters[0].independentLineages).toEqual(["lineage:1"]);
  });

  it("resolved anomalies stop contributing to the active friction cluster", () => {
    const clusters = aggregateInvestigationFriction({
      signals: [
        signal(),
        signal({
          id: "signal-2",
          dimension: "ownership",
          evidenceRefs: ["evidence:2"],
          lineageKeys: ["lineage:2"],
        }),
        signal({
          id: "signal-3",
          dimension: "procedural",
          evidenceRefs: ["evidence:3"],
          lineageKeys: ["lineage:3"],
          status: "resolved",
        }),
      ],
    });

    expect(clusters[0].status).toBe("background_noise");
    expect(clusters[0].unresolvedSignalIds).toEqual([
      "signal-1",
      "signal-2",
    ]);
  });

  it("lets one signal contribute to each involved entity without silently merging identities", () => {
    const clusters = aggregateInvestigationFriction({
      signals: [
        signal({
          entityIds: ["entity:a", "entity:b"],
        }),
      ],
    });

    expect(clusters.map((cluster) => cluster.entityId).sort()).toEqual([
      "entity:a",
      "entity:b",
    ]);
  });

  it("requires multiple independent dimensions and lineages before treating friction as a cluster", () => {
    const clusters = aggregateInvestigationFriction({
      minIndependentLineages: 2,
      minDimensions: 2,
      signals: [
        signal(),
        signal({
          id: "signal-2",
          dimension: "ownership",
          evidenceRefs: ["evidence:2"],
          lineageKeys: ["lineage:2"],
        }),
      ],
    });

    expect(clusters[0].status).toBe("friction_cluster");
  });
});

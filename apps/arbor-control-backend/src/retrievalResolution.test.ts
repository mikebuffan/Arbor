import { describe, expect, it } from "vitest";
import {
  nextRetrievalTier,
  resolveTemporalKnowledge,
  type TemporalKnowledge,
} from "./retrievalResolution.js";

describe("temporal retrieval resolution", () => {
  it("does not resurrect a historically unfinished subsystem after completion", () => {
    const rows: TemporalKnowledge<string>[] = [
      {
        key: "roundabout-building",
        value: "roundabout",
        status: "historical",
        assertedAt: "2026-09-16T12:00:00Z",
        provenance: ["export"],
        confidence: 0.99,
      },
      {
        key: "roundabout-complete",
        value: "roundabout",
        status: "done",
        assertedAt: "2026-09-17T21:00:00Z",
        supersedes: ["roundabout-building"],
        provenance: ["runtime"],
        confidence: 1,
      },
    ];
    expect(resolveTemporalKnowledge(rows).current?.status).toBe("done");
  });

  it("respects validity windows instead of carrying stale relative state forward", () => {
    const rows: TemporalKnowledge<string>[] = [
      {
        key: "upload-yesterday",
        value: "waiting",
        status: "active",
        assertedAt: "2026-09-16T22:00:00Z",
        validUntil: "2026-09-17T00:00:00Z",
        provenance: ["conversation"],
        confidence: 1,
      },
    ];

    expect(
      resolveTemporalKnowledge(
        rows,
        Date.parse("2026-09-17T12:00:00Z"),
      ).current,
    ).toBeUndefined();
  });

  it("keeps competing valid state explicit as conflict", () => {
    const rows: TemporalKnowledge<string>[] = [
      {
        key: "current-a",
        value: "A",
        status: "active",
        assertedAt: "2026-09-17T10:00:00Z",
        provenance: ["source-a"],
        confidence: 0.9,
      },
      {
        key: "current-b",
        value: "B",
        status: "active",
        assertedAt: "2026-09-17T11:00:00Z",
        provenance: ["source-b"],
        confidence: 0.9,
      },
    ];

    const result = resolveTemporalKnowledge(rows);
    expect(result.current?.value).toBe("B");
    expect(result.conflicts).toHaveLength(1);
    expect(result.history).toHaveLength(1);
  });
});

describe("retrieval escalation", () => {
  it("escalates from hot state to raw archive only as needed", () => {
    expect(nextRetrievalTier([], false)).toBe("hot-state");
    expect(nextRetrievalTier(["hot-state"], false)).toBe(
      "structured-index",
    );
    expect(
      nextRetrievalTier(
        ["hot-state", "structured-index"],
        false,
      ),
    ).toBe("pattern-hop");
    expect(
      nextRetrievalTier(
        ["hot-state", "structured-index", "pattern-hop"],
        false,
      ),
    ).toBe("raw-archive");
    expect(nextRetrievalTier(["hot-state"], true)).toBeNull();
  });
});

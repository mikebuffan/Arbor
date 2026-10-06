import { describe, expect, it } from "vitest";
import { evaluateTemporalConstraints } from "./investigationTemporalConstraints";

describe("hard timeline constraints", () => {
  it("flags a hard conflict when even the widest documented windows cannot fit the minimum transition time", () => {
    const [result] = evaluateTemporalConstraints({
      windows: [
        {
          id: "event:a",
          earliestAt: "2026-01-01T10:00:00Z",
          latestAt: "2026-01-01T10:05:00Z",
          evidenceRefs: ["evidence:a"],
        },
        {
          id: "event:b",
          earliestAt: "2026-01-01T10:20:00Z",
          latestAt: "2026-01-01T10:25:00Z",
          evidenceRefs: ["evidence:b"],
        },
      ],
      constraints: [{
        id: "travel:a-b",
        fromWindowId: "event:a",
        toWindowId: "event:b",
        minimumGapMs: 30 * 60 * 1000,
        rationale: "Synthetic minimum travel time.",
        evidenceRefs: ["map:route"],
      }],
    });

    expect(result.status).toBe("hard_conflict");
    expect(result.maximumPossibleGapMs).toBe(25 * 60 * 1000);
    expect(result.note).toContain("does not identify why");
  });

  it("marks a constraint feasible when at least one schedule inside the documented windows can satisfy it", () => {
    const [result] = evaluateTemporalConstraints({
      windows: [
        {
          id: "event:a",
          earliestAt: "2026-01-01T10:00:00Z",
          latestAt: "2026-01-01T10:30:00Z",
          evidenceRefs: ["evidence:a"],
        },
        {
          id: "event:b",
          earliestAt: "2026-01-01T11:00:00Z",
          latestAt: "2026-01-01T12:00:00Z",
          evidenceRefs: ["evidence:b"],
        },
      ],
      constraints: [{
        id: "travel:a-b",
        fromWindowId: "event:a",
        toWindowId: "event:b",
        minimumGapMs: 45 * 60 * 1000,
        rationale: "Synthetic minimum travel time.",
        evidenceRefs: ["map:route"],
      }],
    });

    expect(result.status).toBe("feasible");
  });

  it("rejects reversed event windows rather than smoothing them", () => {
    expect(() => evaluateTemporalConstraints({
      windows: [{
        id: "bad",
        earliestAt: "2026-01-02T00:00:00Z",
        latestAt: "2026-01-01T00:00:00Z",
        evidenceRefs: ["evidence:bad"],
      }],
      constraints: [],
    })).toThrow("temporal_constraint_reversed_window");
  });
});

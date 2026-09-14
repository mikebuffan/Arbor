import { describe, expect, it } from "vitest";

import {
  dedupeEvidenceByOrigin,
  evaluateIndependentSupport,
  type CognitionEvidenceEvent,
} from "./evidence.js";

function event(
  overrides: Partial<CognitionEvidenceEvent> = {},
): CognitionEvidenceEvent {
  return {
    subject: "arbor",
    attribute: "agency_continuation",
    evidenceClass: "observed",
    sourceId: "turn-1",
    originId: "origin-1",
    occurredAt: "2026-09-14T00:00:00.000Z",
    supports: true,
    ...overrides,
  };
}

describe("cognition evidence provenance", () => {
  it("does not multiply copied evidence from the same origin", () => {
    const unique = dedupeEvidenceByOrigin([
      event(),
      event({ sourceId: "export-copy" }),
    ]);

    expect(unique).toHaveLength(1);
  });

  it("does not retain from two supporting events even with independent origins", () => {
    const result = evaluateIndependentSupport([
      event(),
      event({ sourceId: "turn-2", originId: "origin-2" }),
    ]);

    expect(result.qualifies).toBe(false);
    expect(result.qualification).toBe("insufficient");
  });

  it("qualifies three supporting events from at least two independent origins", () => {
    const result = evaluateIndependentSupport([
      event(),
      event({ sourceId: "turn-2", originId: "origin-2" }),
      event({ sourceId: "turn-3", originId: "origin-2", evidenceClass: "implemented" }),
    ]);

    expect(result.qualifies).toBe(true);
    expect(result.qualification).toBe("repeated_independent_evidence");
    expect(result.independentOrigins).toEqual(["origin-1", "origin-2"]);
  });

  it("qualifies passing implementation plus independently observed behavior from independent origins", () => {
    const result = evaluateIndependentSupport([
      event({ evidenceClass: "implemented", passingTest: true }),
      event({
        sourceId: "behavior-turn",
        originId: "behavior-origin",
        independentlyObserved: true,
      }),
    ]);

    expect(result.qualifies).toBe(true);
    expect(result.qualification).toBe("tested_and_independently_observed");
  });

  it("requires source and origin identity", () => {
    expect(() =>
      evaluateIndependentSupport([
        event({ sourceId: "" }),
      ]),
    ).toThrow("cognition_evidence_requires_source_and_origin");
  });
});

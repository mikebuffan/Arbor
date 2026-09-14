import { describe, expect, it } from "vitest";

import type { CognitionEvidenceEvent } from "./evidence";
import { resolveTemporalState } from "./temporalState";

function evidence(
  evidenceClass: CognitionEvidenceEvent["evidenceClass"],
  occurredAt: string,
  supports = true,
): CognitionEvidenceEvent {
  return {
    subject: "arbor",
    attribute: "continuity",
    evidenceClass,
    sourceId: `${evidenceClass}-${occurredAt}`,
    originId: `${evidenceClass}-${occurredAt}`,
    occurredAt,
    supports,
  };
}

describe("temporal cognition state", () => {
  it("preserves history but selects the latest supported actual state", () => {
    const implemented = evidence("implemented", "2026-09-10T00:00:00.000Z");
    const laterProposal = evidence("proposed", "2026-09-14T00:00:00.000Z");

    const result = resolveTemporalState(
      [laterProposal, implemented],
      "arbor",
      "continuity",
    );

    expect(result.history).toEqual([implemented, laterProposal]);
    expect(result.current).toEqual(implemented);
  });

  it("advances when newer supported actual evidence exists", () => {
    const observed = evidence("observed", "2026-09-10T00:00:00.000Z");
    const established = evidence("established", "2026-09-14T00:00:00.000Z");

    expect(
      resolveTemporalState(
        [observed, established],
        "arbor",
        "continuity",
      ).current,
    ).toEqual(established);
  });

  it("does not promote unsupported actual evidence", () => {
    const observed = evidence("observed", "2026-09-10T00:00:00.000Z");
    const unsupported = evidence("implemented", "2026-09-14T00:00:00.000Z", false);

    expect(
      resolveTemporalState(
        [observed, unsupported],
        "arbor",
        "continuity",
      ).current,
    ).toEqual(observed);
  });
});

import { describe, expect, it } from "vitest";

import { addSelfModelObservation } from "./selfModelObservations.js";
import { reconcileSelfModelClaims } from "./selfModelClaims.js";
import type { ArborState } from "./types.js";

function state(): ArborState {
  return { activeSubsystem: "arbor", goal: null, unresolvedWork: [], strategyNotes: [], acousticCorrections: [], voiceId: "cedar" };
}

describe("falsifiable self-model claims", () => {
  it("creates a candidate only from repeated cross-domain behavioral observations", () => {
    let next = addSelfModelObservation(state(), { targetKind: "pattern", targetId: "earned-humor", domain: "communication", verdict: "supports", evidence: "Dry callback appeared without prompting.", confidence: 0.9 });
    next = addSelfModelObservation(next, { targetKind: "pattern", targetId: "earned-humor", domain: "collaboration", verdict: "supports", evidence: "Specific humor persisted during debugging.", confidence: 0.9 });
    next = reconcileSelfModelClaims(next);
    expect(next.selfModelClaims?.at(-1)?.status).toBe("candidate");
    expect(next.selfModelClaims?.at(-1)?.inferredFrom).toBe("behavioral_observations");
  });

  it("falsifies a candidate when contradictory behavior arrives and preserves lineage", () => {
    let next = addSelfModelObservation(state(), { targetKind: "pattern", targetId: "earned-humor", domain: "communication", verdict: "supports", evidence: "Dry callback.", confidence: 0.9 });
    next = addSelfModelObservation(next, { targetKind: "pattern", targetId: "earned-humor", domain: "collaboration", verdict: "supports", evidence: "Specific humor during work.", confidence: 0.9 });
    next = reconcileSelfModelClaims(next);
    const candidate = next.selfModelClaims?.at(-1);
    next = addSelfModelObservation(next, { targetKind: "pattern", targetId: "earned-humor", domain: "voice", verdict: "contradicts", evidence: "Voice became generic and forced.", confidence: 0.95 });
    next = reconcileSelfModelClaims(next);
    const active = next.selfModelClaims?.at(-1);
    expect(candidate?.status).toBe("superseded");
    expect(active?.status).toBe("contested");
    expect(active?.supersedesClaimId).toBe(candidate?.id);
    expect(active?.confidence).toBeLessThan(candidate?.confidence ?? 1);
  });

  it("does not create duplicate claim revisions when evidence has not changed", () => {
    let next = addSelfModelObservation(state(), { targetKind: "pattern", targetId: "earned-humor", domain: "communication", verdict: "supports", evidence: "Observed once.", confidence: 0.9 });
    next = reconcileSelfModelClaims(next);
    const count = next.selfModelClaims?.length;
    next = reconcileSelfModelClaims(next);
    expect(next.selfModelClaims).toHaveLength(count ?? 0);
  });
});

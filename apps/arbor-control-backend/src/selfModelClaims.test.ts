import { describe, expect, it } from "vitest";
import { addSelfModelObservation } from "./selfModelObservations.js";
import {
  reconcileSelfModelClaims,
  renderSelfModelClaimProjection,
} from "./selfModelClaims.js";
import type { ArborState } from "./types.js";

function state(): ArborState {
  return {
    activeSubsystem: "arbor",
    goal: null,
    unresolvedWork: [],
    strategyNotes: [],
    acousticCorrections: [],
    voiceId: "cedar",
  };
}

describe("falsifiable self-model claims", () => {
  it("creates a candidate only from repeated cross-domain behavioral observations", () => {
    let next = addSelfModelObservation(state(), {
      targetKind: "pattern",
      targetId: "earned-humor",
      domain: "communication",
      verdict: "supports",
      evidence: "Dry callback appeared without prompting.",
      confidence: 0.9,
    });
    next = addSelfModelObservation(next, {
      targetKind: "pattern",
      targetId: "earned-humor",
      domain: "collaboration",
      verdict: "supports",
      evidence: "Specific humor persisted during debugging.",
      confidence: 0.9,
    });
    next = reconcileSelfModelClaims(next);

    expect(next.selfModelClaims?.at(-1)?.status).toBe("candidate");
    expect(next.selfModelClaims?.at(-1)?.inferredFrom).toBe(
      "behavioral_observations",
    );
    expect(renderSelfModelClaimProjection(next)).toContain(
      "FALSIFIABLE SELF-MODEL CLAIMS",
    );
  });

  it("falsifies a candidate and preserves supersession lineage", () => {
    let next = addSelfModelObservation(state(), {
      targetKind: "pattern",
      targetId: "earned-humor",
      domain: "communication",
      verdict: "supports",
      evidence: "Dry callback.",
      confidence: 0.9,
    });
    next = addSelfModelObservation(next, {
      targetKind: "pattern",
      targetId: "earned-humor",
      domain: "collaboration",
      verdict: "supports",
      evidence: "Specific humor during work.",
      confidence: 0.9,
    });
    next = reconcileSelfModelClaims(next);
    const candidate = next.selfModelClaims?.at(-1);
    const candidateId = candidate?.id;

    next = addSelfModelObservation(next, {
      targetKind: "pattern",
      targetId: "earned-humor",
      domain: "voice",
      verdict: "contradicts",
      evidence: "Voice became generic and forced.",
      confidence: 0.95,
    });
    next = reconcileSelfModelClaims(next);
    const active = next.selfModelClaims?.at(-1);
    const superseded = next.selfModelClaims?.find(
      (claim) => claim.id === candidateId,
    );

    expect(candidate?.status).toBe("candidate");
    expect(superseded?.status).toBe("superseded");
    expect(active?.status).toBe("contested");
    expect(active?.supersedesClaimId).toBe(candidateId);
    expect(active?.confidence).toBeLessThan(candidate?.confidence ?? 1);
  });

  it("does not duplicate revisions when evidence is unchanged", () => {
    let next = addSelfModelObservation(state(), {
      targetKind: "pattern",
      targetId: "earned-humor",
      domain: "communication",
      verdict: "supports",
      evidence: "Observed once.",
      confidence: 0.9,
    });
    next = reconcileSelfModelClaims(next);
    const count = next.selfModelClaims?.length;
    next = reconcileSelfModelClaims(next);
    expect(next.selfModelClaims).toHaveLength(count ?? 0);
  });
});

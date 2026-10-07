import { describe, expect, it } from "vitest";
import { addSelfModelObservation, summarizeSelfModelObservations } from "./selfModelObservations.js";
import { reconcileSelfModelClaims } from "./selfModelClaims.js";
import type { ArborState } from "./types.js";

function baseState(): ArborState {
  return {
    activeSubsystem: "arbor",
    goal: null,
    unresolvedWork: [],
    strategyNotes: [],
    acousticCorrections: [],
    voiceId: "cedar",
  };
}

function observation(
  state: ArborState,
  domain: string,
  sourceTurnId?: string,
  verdict: "supports" | "contradicts" = "supports",
): ArborState {
  return addSelfModelObservation(state, {
    targetKind: "pattern",
    targetId: "earned-humor",
    domain,
    verdict,
    evidence: `Synthetic, inspectable ${domain} observation`,
    confidence: 0.95,
    ...(sourceTurnId === undefined ? {} : { sourceTurnId }),
  });
}

describe("Group 06 self-model evidence provenance boundaries", () => {
  it("does not promote two domain labels from one source turn", () => {
    const state = observation(observation(baseState(), "communication", "turn-1"), "collaboration", "turn-1");
    const summary = summarizeSelfModelObservations(state)[0];
    expect(summary?.supportCount).toBe(2);
    expect(summary?.supportDomains).toEqual(["collaboration", "communication"]);
    expect(summary?.distinctSupportTurnCount).toBe(1);
    expect(summary?.status).toBe("insufficient");
    expect(reconcileSelfModelClaims(state).selfModelClaims?.at(-1)?.status).toBe("insufficient");
  });

  it("does not treat unsourced questionnaire answers or user-stated preferences as observed behavior", () => {
    let state = observation(baseState(), "communication");
    state = observation(state, "collaboration");
    const summary = summarizeSelfModelObservations(state)[0];
    expect(summary?.distinctSupportTurnCount).toBe(0);
    expect(summary?.status).toBe("insufficient");
    expect(state.selfModel).toBeUndefined();
  });

  it("permits only a provisional candidate from two distinct traceable turns and domains", () => {
    let state = observation(baseState(), "communication", "turn-1");
    state = observation(state, "collaboration", "turn-2");
    const summary = summarizeSelfModelObservations(state)[0];
    expect(summary?.distinctSupportTurnCount).toBe(2);
    expect(summary?.status).toBe("candidate");
    const claims = reconcileSelfModelClaims(state);
    expect(claims.selfModelClaims?.at(-1)?.status).toBe("candidate");
    expect(claims.selfModel).toBeUndefined();
  });

  it("preserves a contradiction and downgrades the provisional claim, without altering identity", () => {
    let state = observation(observation(baseState(), "communication", "turn-1"), "collaboration", "turn-2");
    state = reconcileSelfModelClaims(state);
    const prior = state.selfModelClaims?.at(-1);
    state = observation(state, "voice", "turn-3", "contradicts");
    state = reconcileSelfModelClaims(state);
    expect(state.selfModelClaims?.at(-1)?.status).toBe("contested");
    expect(state.selfModelClaims?.at(-1)?.supersedesClaimId).toBe(prior?.id);
    expect(state.selfModelClaims?.find(claim => claim.id === prior?.id)?.status).toBe("superseded");
    expect(state.selfModel).toBeUndefined();
  });

  it("rejects blank/oversized source-turn IDs and deduplicates normalized replay", () => {
    expect(() => observation(baseState(), "communication", "  ")).toThrow("self_model_observation_source_turn_invalid");
    expect(() => observation(baseState(), "communication", "x".repeat(201))).toThrow("self_model_observation_source_turn_invalid");
    const once = observation(baseState(), "communication", " turn-1 ");
    const replay = observation(once, "communication", "turn-1");
    expect(replay.selfModelObservations).toHaveLength(1);
  });

  it("cannot manufacture a stronger claim by re-labeling the same turn repeatedly", () => {
    let state = baseState();
    for (const domain of ["communication", "collaboration", "work", "voice"]) {
      state = observation(state, domain, "same-turn");
    }
    const summary = summarizeSelfModelObservations(state)[0];
    expect(summary?.distinctSupportTurnCount).toBe(1);
    expect(summary?.status).toBe("insufficient");
    const claim = reconcileSelfModelClaims(state).selfModelClaims?.at(-1);
    expect(claim?.status).toBe("insufficient");
    expect(claim?.confidence).toBeLessThan(0.8);
  });
});

import { describe, expect, it } from "vitest";
import {
  packetHasRequiredMeaning,
  roadsForVaultDomain,
  routeFireflyPacket,
  routeSignal,
  shouldCrossContextBridge,
} from "../knowledgeRouting";

describe("Vault → roads integration", () => {
  it("routes identity only to identity/self-model by default", () => {
    expect(roadsForVaultDomain("identity")).toEqual(["identity_self_model"]);
  });

  it("routes corrections backward instead of silently acknowledging them", () => {
    expect(routeSignal("correction")).toBe("backtrack");
  });

  it("preserves unresolved work as forward-driving signal", () => {
    expect(routeSignal("unresolved_work")).toBe("continue");
  });

  it("holds contradictions for cross-check rather than smoothing them away", () => {
    expect(routeSignal("contradiction")).toBe("hold");
  });

  it("does not inject low relevance context merely because it exists", () => {
    expect(shouldCrossContextBridge({ relevance: 0.2 })).toBe(false);
    expect(shouldCrossContextBridge({ relevance: 0.8 })).toBe(true);
  });

  it("lets corrections and active objectives cross even before generic relevance threshold", () => {
    expect(shouldCrossContextBridge({ relevance: 0.1, hasCorrection: true })).toBe(true);
    expect(shouldCrossContextBridge({ relevance: 0.1, activeObjectiveMatch: true })).toBe(true);
  });

  it("rejects packets that lost provenance", () => {
    expect(packetHasRequiredMeaning({ packetType: "memory", meaning: "known thing", provenance: [] })).toBe(false);
    expect(packetHasRequiredMeaning({ packetType: "memory", meaning: "known thing", provenance: [{ sourceKind: "vault", sourceRef: "entry" }] })).toBe(true);
  });
});

describe("architectural ablations", () => {
  it("predicts correction propagation failure when the correction signal is absent", () => {
    expect(shouldCrossContextBridge({ relevance: 0.1, hasCorrection: false })).toBe(false);
    expect(shouldCrossContextBridge({ relevance: 0.1, hasCorrection: true })).toBe(true);
  });

  it("predicts babysitting regression if unresolved-work routing is replaced by completion", () => {
    expect(routeSignal("unresolved_work")).toBe("continue");
    expect(routeSignal("completion")).toBe("close_loop");
  });
});


const fireflyScope = {
  userId: "fixture-owner",
  projectId: "fixture-project",
  conversationId: "fixture-conversation",
  turnId: "fixture-turn",
};

const fireflyPacket = {
  packetType: "observation",
  meaning: "Objective is unfinished; check the next safe step.",
  relevance: 0.1,
  confidence: 0.8,
  provenance: [
    { sourceKind: "pattern_hop", sourceRef: "synthetic-evidence" },
  ],
};

const route = (overrides: Record<string, unknown> = {}) =>
  routeFireflyPacket({
    scope: fireflyScope,
    domain: "memory",
    packet: fireflyPacket,
    stage: "observe",
    rhythm: "stability",
    signal: "retrieval",
    ...overrides,
  });

describe("Firefly Principle on canonical knowledge roundabout", () => {
  it("distinguishes both choices and cycles only after reviewed consequence", () => {
    expect(route().suggestedNextStage).toBe("first_choice");
    expect(route({ stage: "first_choice" }).suggestedNextStage).toBe("awareness");
    expect(route({ stage: "awareness" }).suggestedNextStage).toBe("second_choice");

    const pending = route({ stage: "second_choice" });
    expect(pending.suggestedNextStage).toBe("second_choice");
    expect(pending.decision).toBe("hold");
    expect(pending.reason).toBe("await_verified_consequence");

    const finished = route({
      stage: "second_choice",
      verifiedConsequenceRef: "host-reviewed-outcome",
    });
    expect(finished.suggestedNextStage).toBe("consequence");
    expect(finished.consequenceVerifiedByThisCode).toBe(false);
  });

  it("holds contradictions and unverified completion", () => {
    const hold = route({
      signal: "active_objective",
      packet: {
        ...fireflyPacket,
        conflicts: ["synthetic contradictory source"],
      },
    });
    expect(hold.decision).toBe("hold");
    expect(hold.reason).toBe("contradiction_hold");
    expect(hold.targetRoads).toContain("evidence_world_model");

    const completion = route({
      stage: "consequence",
      signal: "completion",
    });
    expect(completion.decision).toBe("hold");
    expect(completion.reason).toBe("unverified_completion");
    expect(completion.grantsExecution).toBe(false);
  });

  it("returns corrections to observation and preserves interruption/return semantics", () => {
    const correction = route({
      stage: "awareness",
      signal: "correction",
    });
    expect(correction.decision).toBe("backtrack");
    expect(correction.suggestedNextStage).toBe("observe");

    const paused = route({
      stage: "awareness",
      rhythm: "instability",
      signal: "active_objective",
    });
    expect(paused.decision).toBe("hold");
    expect(paused.reason).toBe("interrupted_hold");

    const resumed = route({
      stage: "awareness",
      rhythm: "return",
      signal: "active_objective",
    });
    expect(resumed.decision).toBe("backtrack");
    expect(resumed.reason).toBe("return_reobserve");
  });

  it("keeps low-relevance retrieval out of cross-context bridges unless objective relevance requires it", () => {
    expect(route().bridgeRecommended).toBe(false);
    expect(route({
      packet: { ...fireflyPacket, relevance: 0.9 },
    }).bridgeRecommended).toBe(true);
    const objective = route({ signal: "unresolved_work" });
    expect(objective.bridgeRecommended).toBe(true);
    expect(objective.targetRoads).toContain("agency_open_loops");
  });

  it("rejects malformed, provenance-free or forged routing input", () => {
    expect(() => route({
      scope: { ...fireflyScope, conversationId: "" },
    })).toThrow("firefly_roundabout_scope_required");

    expect(() => route({
      packet: { ...fireflyPacket, provenance: [] },
    })).toThrow("firefly_roundabout_packet_invalid");

    expect(() => route({
      rhythm: "superhuman",
    })).toThrow("firefly_roundabout_vocabulary_invalid");
  });
});

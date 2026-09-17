import { describe, expect, it } from "vitest";
import { packetHasRequiredMeaning, roadsForVaultDomain, routeSignal, shouldCrossContextBridge } from "../knowledgeRouting";

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

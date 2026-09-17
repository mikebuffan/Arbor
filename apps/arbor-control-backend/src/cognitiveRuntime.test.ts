import { describe, expect, it } from "vitest";
import {
  emptyCognitiveRuntimeState,
  renderCognitiveRuntime,
  updateCognitiveRuntime,
} from "./cognitiveRuntime.js";

describe("persistent cognitive runtime", () => {
  it("carries live bridge state while expiring stale signals", () => {
    const now = Date.parse("2026-09-18T12:00:00Z");
    const state = updateCognitiveRuntime({
      prior: emptyCognitiveRuntimeState(now),
      now,
      signals: [
        { id: "old", kind: "memory", content: "old", reason: "archive", provenance: ["a"], confidence: 1, intensity: 1, assertedAt: "2026-09-17T00:00:00Z", validUntil: "2026-09-18T00:00:00Z" },
        { id: "goal", kind: "task", content: "finish", reason: "active objective", provenance: ["runtime"], confidence: 1, intensity: 1, assertedAt: "2026-09-18T11:00:00Z" },
      ],
    });
    expect(state.signals.map((x) => x.id)).toEqual(["goal"]);
    expect(state.attention.focusIds).toEqual(["goal"]);
  });

  it("persists material prediction error, choices, useful curiosity and causal history", () => {
    const now = Date.parse("2026-09-18T12:00:00Z");
    const state = updateCognitiveRuntime({
      now,
      prediction: { id: "expected-result", expectation: .9, observed: .2 },
      counterfactuals: [
        { id: "unsafe", expectedUtility: 1, evidenceConfidence: 1, reversible: false, blocked: true },
        { id: "safe", expectedUtility: .8, evidenceConfidence: .9, reversible: true },
      ],
      curiosity: [
        { id: "rabbit", uncertainty: 1, relevance: .01, expectedInformationGain: 1, cost: 0 },
        { id: "discriminator", uncertainty: .8, relevance: 1, expectedInformationGain: .9, cost: .1 },
      ],
      causalTrace: {
        eventId: "e1",
        internalStateChange: "conflict increased",
        attentionEffect: "evidence promoted",
        expectationEffect: "confidence reduced",
        interpretationEffect: "claim unresolved",
        choiceId: "safe",
        provenance: ["source"],
      },
    });
    expect(state.predictions[0]?.material).toBe(true);
    expect(state.counterfactuals.map((x) => x.id)).toEqual(["safe"]);
    expect(state.exploration?.id).toBe("discriminator");
    expect(state.causalTraces).toHaveLength(1);
    expect(renderCognitiveRuntime(state)).toContain("MATERIAL PREDICTION ERRORS");
  });

  it("keeps durable consolidation and rejects transient/superseded state", () => {
    const state = updateCognitiveRuntime({
      consolidation: [
        { id: "keep", content: "corrected fact", provenance: ["turn"], confidence: 1, durable: true },
        { id: "drop", content: "tonight", provenance: ["turn"], confidence: 1, durable: true, transient: true },
        { id: "old", content: "unfinished", provenance: ["archive"], confidence: 1, durable: true, superseded: true },
      ],
    });
    expect(state.consolidation.map((x) => x.id)).toEqual(["keep"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  allocateAttention,
  chooseExploration,
  completeCausalTrace,
  consolidate,
  observePrediction,
  rankCounterfactuals,
  type BridgeSignal,
} from "./cognitiveDynamics.js";

describe("attention and bridges", () => {
  it("promotes unresolved conflict without allowing expired state back in", () => {
    const signals: BridgeSignal[] = [
      { id: "stale", kind: "memory", content: "old", reason: "archive", provenance: ["archive"], confidence: 1, intensity: 1, assertedAt: "2026-09-16T00:00:00Z", validUntil: "2026-09-17T00:00:00Z" },
      { id: "conflict", kind: "conflict", content: "claims disagree", reason: "requires discrimination", provenance: ["source-a", "source-b"], confidence: .8, intensity: .8, assertedAt: "2026-09-17T12:00:00Z", unresolved: true },
      { id: "task", kind: "task", content: "finish objective", reason: "active objective", provenance: ["runtime"], confidence: 1, intensity: .7, assertedAt: "2026-09-17T12:00:00Z" },
    ];
    const state = allocateAttention(signals, 2, Date.parse("2026-09-17T13:00:00Z"));
    expect(state.focusIds).toContain("conflict");
    expect(state.focusIds).not.toContain("stale");
    expect(state.unresolvedIds).toContain("conflict");
  });
});

describe("prediction error", () => {
  it("records direction and materiality without forcing every miss into an update", () => {
    expect(observePrediction("p", .8, .75).material).toBe(false);
    const miss = observePrediction("p", .8, .2);
    expect(miss.material).toBe(true);
    expect(miss.error).toBeCloseTo(-.6);
  });
});

describe("counterfactual choice", () => {
  it("excludes blocked paths and slightly favors reversible matched options", () => {
    const ranked = rankCounterfactuals([
      { id: "blocked", expectedUtility: 1, evidenceConfidence: 1, reversible: true, blocked: true },
      { id: "irreversible", expectedUtility: .8, evidenceConfidence: .8, reversible: false },
      { id: "reversible", expectedUtility: .8, evidenceConfidence: .8, reversible: true },
    ]);
    expect(ranked.map((x) => x.id)).toEqual(["reversible", "irreversible"]);
  });
});

describe("curiosity", () => {
  it("explores only when uncertainty reduction is relevant enough to justify cost", () => {
    expect(chooseExploration([{ id: "rabbit-hole", uncertainty: 1, relevance: .05, expectedInformationGain: 1, cost: 0 }])).toBeNull();
    expect(chooseExploration([{ id: "discriminator", uncertainty: .9, relevance: 1, expectedInformationGain: .9, cost: .1 }])?.id).toBe("discriminator");
  });
});

describe("consolidation", () => {
  it("keeps durable sourced state while rejecting transient, superseded, unsourced and duplicate material", () => {
    const kept = consolidate([
      { id: "a", content: "correction", provenance: ["turn-1"], confidence: 1, durable: true },
      { id: "dup", content: "correction", provenance: ["turn-1"], confidence: 1, durable: true },
      { id: "transient", content: "tonight", provenance: ["turn-2"], confidence: 1, durable: true, transient: true },
      { id: "old", content: "unfinished", provenance: ["archive"], confidence: 1, durable: true, superseded: true },
      { id: "unsourced", content: "guess", provenance: [], confidence: 1, durable: true },
    ]);
    expect(kept.map((x) => x.id)).toEqual(["a"]);
  });
});

describe("causal traces", () => {
  it("requires event → internal state → attention → expectation → interpretation with provenance", () => {
    expect(completeCausalTrace({
      eventId: "event-1",
      internalStateChange: "tension increased",
      attentionEffect: "conflict promoted",
      expectationEffect: "lowered confidence",
      interpretationEffect: "treated claim as unresolved",
      choiceId: "seek-discriminating-evidence",
      provenance: ["source-a"],
    })).toBe(true);
  });
});

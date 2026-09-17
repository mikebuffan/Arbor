import { describe, expect, it } from "vitest";
import { compareEfficiency, summarizeBenchmark } from "./benchmark.js";

describe("benchmark accounting", () => {
  it("measures accuracy false release compute and latency without conflating them", () => {
    const candidate = summarizeBenchmark([
      { id: "1", correct: true, falseRelease: false, computeSpent: 10, latencyMs: 20 },
      { id: "2", correct: true, falseRelease: false, computeSpent: 20, latencyMs: 30 },
    ]);
    const baseline = summarizeBenchmark([
      { id: "1", correct: true, falseRelease: false, computeSpent: 40, latencyMs: 50 },
      { id: "2", correct: false, falseRelease: true, computeSpent: 40, latencyMs: 50 },
    ]);
    const comparison = compareEfficiency(candidate, baseline);
    expect(candidate.accuracy).toBe(1);
    expect(candidate.falseReleaseRate).toBe(0);
    expect(comparison.accuracyDelta).toBe(0.5);
    expect(comparison.falseReleaseDelta).toBe(-0.5);
    expect(comparison.computeRatio).toBe(0.375);
    expect(comparison.latencyRatio).toBe(0.5);
  });
});
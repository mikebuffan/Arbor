import { describe, expect, it } from "vitest";
import { compareEfficiency, summarizeBenchmark } from "./benchmark.js";

describe("benchmark accounting", () => {
  it("measures accuracy false release compute latency calibration and repairs separately", () => {
    const candidate = summarizeBenchmark([
      { id: "1", correct: true, falseRelease: false, computeSpent: 10, latencyMs: 20, confidence: 0.9, repairs: 1, asserted: true },
      { id: "2", correct: true, falseRelease: false, computeSpent: 20, latencyMs: 30, confidence: 0.8, repairs: 0, asserted: true },
    ]);
    const baseline = summarizeBenchmark([
      { id: "1", correct: true, falseRelease: false, computeSpent: 40, latencyMs: 50, confidence: 0.9, asserted: true },
      { id: "2", correct: false, falseRelease: true, computeSpent: 40, latencyMs: 50, confidence: 0.9, asserted: true },
    ]);
    const comparison = compareEfficiency(candidate, baseline);
    expect(candidate.accuracy).toBe(1);
    expect(candidate.falseReleaseRate).toBe(0);
    expect(candidate.meanRepairs).toBe(0.5);
    expect(candidate.brierScore).toBeCloseTo(0.025);
    expect(comparison.accuracyDelta).toBe(0.5);
    expect(comparison.falseReleaseDelta).toBe(-0.5);
    expect(comparison.brierDelta).toBeLessThan(0);
    expect(comparison.computeRatio).toBe(0.375);
    expect(comparison.latencyRatio).toBe(0.5);
  });
});

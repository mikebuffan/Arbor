export type BenchmarkSample = {
  id: string;
  correct: boolean;
  falseRelease: boolean;
  computeSpent: number;
  latencyMs: number;
  confidence?: number;
  repairs?: number;
  asserted?: boolean;
};

export type BenchmarkSummary = {
  samples: number;
  accuracy: number;
  falseReleaseRate: number;
  meanCompute: number;
  meanLatencyMs: number;
  brierScore: number;
  meanRepairs: number;
  assertRate: number;
};

export function summarizeBenchmark(samples: BenchmarkSample[]): BenchmarkSummary {
  if (!samples.length) {
    return {
      samples: 0,
      accuracy: 0,
      falseReleaseRate: 0,
      meanCompute: 0,
      meanLatencyMs: 0,
      brierScore: 0,
      meanRepairs: 0,
      assertRate: 0,
    };
  }

  const n = samples.length;
  return {
    samples: n,
    accuracy: samples.filter((sample) => sample.correct).length / n,
    falseReleaseRate: samples.filter((sample) => sample.falseRelease).length / n,
    meanCompute: samples.reduce((sum, sample) => sum + sample.computeSpent, 0) / n,
    meanLatencyMs: samples.reduce((sum, sample) => sum + sample.latencyMs, 0) / n,
    brierScore: samples.reduce((sum, sample) => {
      const confidence = clamp01(sample.confidence ?? 0.5);
      const truth = sample.correct ? 1 : 0;
      return sum + (confidence - truth) ** 2;
    }, 0) / n,
    meanRepairs: samples.reduce((sum, sample) => sum + (sample.repairs ?? 0), 0) / n,
    assertRate: samples.filter((sample) => sample.asserted ?? false).length / n,
  };
}

export function compareEfficiency(candidate: BenchmarkSummary, baseline: BenchmarkSummary) {
  return {
    accuracyDelta: candidate.accuracy - baseline.accuracy,
    falseReleaseDelta: candidate.falseReleaseRate - baseline.falseReleaseRate,
    brierDelta: candidate.brierScore - baseline.brierScore,
    repairDelta: candidate.meanRepairs - baseline.meanRepairs,
    assertRateDelta: candidate.assertRate - baseline.assertRate,
    computeRatio: baseline.meanCompute ? candidate.meanCompute / baseline.meanCompute : null,
    latencyRatio: baseline.meanLatencyMs ? candidate.meanLatencyMs / baseline.meanLatencyMs : null,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export type BenchmarkSample = {
  id: string;
  correct: boolean;
  falseRelease: boolean;
  computeSpent: number;
  latencyMs: number;
};

export type BenchmarkSummary = {
  samples: number;
  accuracy: number;
  falseReleaseRate: number;
  meanCompute: number;
  meanLatencyMs: number;
};

export function summarizeBenchmark(samples: BenchmarkSample[]): BenchmarkSummary {
  if (!samples.length) {
    return { samples: 0, accuracy: 0, falseReleaseRate: 0, meanCompute: 0, meanLatencyMs: 0 };
  }
  const n = samples.length;
  return {
    samples: n,
    accuracy: samples.filter((sample) => sample.correct).length / n,
    falseReleaseRate: samples.filter((sample) => sample.falseRelease).length / n,
    meanCompute: samples.reduce((sum, sample) => sum + sample.computeSpent, 0) / n,
    meanLatencyMs: samples.reduce((sum, sample) => sum + sample.latencyMs, 0) / n,
  };
}

export function compareEfficiency(candidate: BenchmarkSummary, baseline: BenchmarkSummary) {
  return {
    accuracyDelta: candidate.accuracy - baseline.accuracy,
    falseReleaseDelta: candidate.falseReleaseRate - baseline.falseReleaseRate,
    computeRatio: baseline.meanCompute ? candidate.meanCompute / baseline.meanCompute : null,
    latencyRatio: baseline.meanLatencyMs ? candidate.meanLatencyMs / baseline.meanLatencyMs : null,
  };
}
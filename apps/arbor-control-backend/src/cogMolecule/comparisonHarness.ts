import { summarizeBenchmark, compareEfficiency, type BenchmarkSample, type BenchmarkSummary } from "./benchmark.js";
import type { CogPacket, MoleculeResult } from "./types.js";

export type ComparableRuntime = {
  run(packet: CogPacket): Promise<MoleculeResult>;
};

export type ComparisonCase = {
  id: string;
  packet: CogPacket;
  correct(result: MoleculeResult): boolean;
};

export type RuntimeComparison = {
  candidate: BenchmarkSummary;
  baseline: BenchmarkSummary;
  efficiency: ReturnType<typeof compareEfficiency>;
  candidateSamples: BenchmarkSample[];
  baselineSamples: BenchmarkSample[];
};

export async function compareRuntimes(
  candidate: ComparableRuntime,
  baseline: ComparableRuntime,
  cases: ComparisonCase[],
): Promise<RuntimeComparison> {
  const candidateSamples: BenchmarkSample[] = [];
  const baselineSamples: BenchmarkSample[] = [];

  for (const testCase of cases) {
    candidateSamples.push(await measure(candidate, testCase));
    baselineSamples.push(await measure(baseline, testCase));
  }

  const candidateSummary = summarizeBenchmark(candidateSamples);
  const baselineSummary = summarizeBenchmark(baselineSamples);

  return {
    candidate: candidateSummary,
    baseline: baselineSummary,
    efficiency: compareEfficiency(candidateSummary, baselineSummary),
    candidateSamples,
    baselineSamples,
  };
}

async function measure(runtime: ComparableRuntime, testCase: ComparisonCase): Promise<BenchmarkSample> {
  const started = performance.now();
  const result = await runtime.run(structuredClone(testCase.packet));
  const latencyMs = performance.now() - started;
  const correct = testCase.correct(result);

  return {
    id: testCase.id,
    correct,
    falseRelease: result.disposition === "assert" && !correct,
    computeSpent: result.computeSpent,
    latencyMs,
  };
}

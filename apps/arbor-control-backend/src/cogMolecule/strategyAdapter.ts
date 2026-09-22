import { observeStrategy } from "../selfUpdate.js";
import type { ArborState } from "../types.js";
import type { CogEvidence } from "./types.js";

export function strategyEvidence(state: ArborState): CogEvidence[] {
  return (state.strategyCandidates ?? []).map((candidate, index) => ({
    id: `strategy:${index}:${candidate.status}`,
    value: candidate,
    provenance: ["arbor:strategy-candidates"],
    confidence: strategyConfidence(candidate.successes, candidate.failures),
  }));
}

export function recordVerifiedMoleculeStrategy(
  state: ArborState,
  strategy: string,
  verificationPassed: boolean,
): ArborState {
  return observeStrategy(state, strategy, verificationPassed);
}

function strategyConfidence(successes: number, failures: number): number {
  const total = successes + failures;
  if (!total) return 0.5;
  return Math.max(0, Math.min(1, successes / total));
}

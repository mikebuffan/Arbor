export type SignalKind = "memory" | "body" | "perception" | "task" | "conflict" | "self-model";

export interface BridgeSignal {
  id: string;
  kind: SignalKind;
  content: string;
  reason: string;
  provenance: string[];
  confidence: number;
  intensity: number;
  assertedAt: string;
  validUntil?: string;
  unresolved?: boolean;
}

export interface AttentionState {
  focusIds: string[];
  unresolvedIds: string[];
  reasons: Record<string, string>;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const when = (v?: string) => v ? Date.parse(v) : Number.NaN;

export function validSignal(signal: BridgeSignal, now = Date.now()): boolean {
  const until = when(signal.validUntil);
  return !Number.isFinite(until) || now < until;
}

export function allocateAttention(
  signals: BridgeSignal[],
  capacity = 4,
  now = Date.now(),
): AttentionState {
  const scored = signals
    .filter((s) => validSignal(s, now))
    .map((signal) => ({
      signal,
      score: clamp(signal.confidence) * 0.35
        + clamp(signal.intensity) * 0.35
        + (signal.kind === "conflict" ? 0.2 : 0)
        + (signal.unresolved ? 0.1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.signal.id.localeCompare(b.signal.id));

  const selected = scored.slice(0, Math.max(0, capacity)).map((x) => x.signal);
  return {
    focusIds: selected.map((s) => s.id),
    unresolvedIds: selected.filter((s) => s.unresolved).map((s) => s.id),
    reasons: Object.fromEntries(selected.map((s) => [s.id, s.reason])),
  };
}

export interface PredictionRecord {
  id: string;
  expectation: number;
  observed?: number;
  error?: number;
  material: boolean;
}

export function observePrediction(
  id: string,
  expectation: number,
  observed: number,
  materialThreshold = 0.2,
): PredictionRecord {
  const expected = clamp(expectation);
  const actual = clamp(observed);
  const error = actual - expected;
  return {
    id,
    expectation: expected,
    observed: actual,
    error,
    material: Math.abs(error) >= materialThreshold,
  };
}

export interface CounterfactualOption {
  id: string;
  expectedUtility: number;
  evidenceConfidence: number;
  reversible: boolean;
  blocked?: boolean;
}

export function rankCounterfactuals(options: CounterfactualOption[]): CounterfactualOption[] {
  return [...options]
    .filter((o) => !o.blocked)
    .sort((a, b) => {
      const aScore = a.expectedUtility * clamp(a.evidenceConfidence) + (a.reversible ? 0.05 : 0);
      const bScore = b.expectedUtility * clamp(b.evidenceConfidence) + (b.reversible ? 0.05 : 0);
      return bScore - aScore || a.id.localeCompare(b.id);
    });
}

export interface CuriosityCandidate {
  id: string;
  uncertainty: number;
  relevance: number;
  expectedInformationGain: number;
  cost: number;
}

export function chooseExploration(candidates: CuriosityCandidate[], minimumValue = 0.15): CuriosityCandidate | null {
  const ranked = candidates
    .map((candidate) => ({
      candidate,
      value: clamp(candidate.uncertainty)
        * clamp(candidate.relevance)
        * clamp(candidate.expectedInformationGain)
        - Math.max(0, candidate.cost),
    }))
    .filter((x) => x.value >= minimumValue)
    .sort((a, b) => b.value - a.value || a.candidate.id.localeCompare(b.candidate.id));
  return ranked[0]?.candidate ?? null;
}

export interface ConsolidationCandidate {
  id: string;
  content: string;
  provenance: string[];
  confidence: number;
  durable: boolean;
  superseded?: boolean;
  transient?: boolean;
}

export function consolidate(candidates: ConsolidationCandidate[]): ConsolidationCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (!candidate.durable || candidate.transient || candidate.superseded) return false;
    if (candidate.provenance.length === 0 || clamp(candidate.confidence) < 0.5) return false;
    const key = `${candidate.content}\u0000${candidate.provenance.join("|")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface CausalTrace {
  eventId: string;
  internalStateChange: string;
  attentionEffect: string;
  expectationEffect: string;
  interpretationEffect: string;
  choiceId?: string;
  consequence?: string;
  provenance: string[];
}

export function completeCausalTrace(trace: CausalTrace): boolean {
  return Boolean(
    trace.eventId.trim()
    && trace.internalStateChange.trim()
    && trace.attentionEffect.trim()
    && trace.expectationEffect.trim()
    && trace.interpretationEffect.trim()
    && trace.provenance.length,
  );
}

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
  validFrom?: string;
  validUntil?: string;
  lastVerifiedAt?: string;
  status?: "active" | "done" | "blocked" | "superseded" | "historical";
  supersedes?: string[];
  stakes?: number;
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
  if (signal.status === "superseded" || signal.status === "historical") return false;
  const from = when(signal.validFrom);
  const until = when(signal.validUntil);
  return (!Number.isFinite(from) || from <= now)
    && (!Number.isFinite(until) || now < until);
}

export function liveSignals(signals: BridgeSignal[], now = Date.now()): BridgeSignal[] {
  const superseded = new Set(signals.flatMap((signal) => signal.supersedes ?? []));
  return signals.filter((signal) =>
    !superseded.has(signal.id) && validSignal(signal, now)
  );
}

export function allocateAttention(
  signals: BridgeSignal[],
  capacity = 4,
  now = Date.now(),
): AttentionState {
  const scored = liveSignals(signals, now)
    .map((signal) => ({
      signal,
      score: clamp(signal.confidence) * 0.35
        + clamp(signal.intensity) * 0.35
        + (signal.kind === "conflict" ? 0.2 : 0)
        + (signal.unresolved ? 0.1 : 0)
        + clamp(signal.stakes ?? 0) * 0.1,
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
    .filter((o) => !o.blocked && Number.isFinite(o.expectedUtility) &&
      Number.isFinite(o.evidenceConfidence))
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
  // The existing information-gain ranking is advisory. Malformed scores,
  // duplicate identities, or an invalid threshold cannot justify exploration.
  if (!Array.isArray(candidates) || !Number.isFinite(minimumValue) || minimumValue < 0)
    return null;
  const idCounts = new Map<string, number>();
  for (const candidate of candidates) {
    if (candidate && typeof candidate.id === "string") {
      idCounts.set(candidate.id, (idCounts.get(candidate.id) ?? 0) + 1);
    }
  }
  const ranked = candidates
    .filter((candidate) => candidate &&
      typeof candidate.id === "string" && candidate.id.trim().length > 0 &&
      idCounts.get(candidate.id) === 1 &&
      [candidate.uncertainty, candidate.relevance, candidate.expectedInformationGain]
        .every(value => Number.isFinite(value) && value >= 0 && value <= 1) &&
      Number.isFinite(candidate.cost) && candidate.cost >= 0)
    .map((candidate) => ({
      candidate,
      value: candidate.uncertainty
        * candidate.relevance
        * candidate.expectedInformationGain
        - candidate.cost,
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
    if (!Array.isArray(candidate.provenance) || !candidate.provenance.length ||
        candidate.provenance.some(ref => typeof ref !== "string" || !ref.trim()) ||
        !Number.isFinite(candidate.confidence) || clamp(candidate.confidence) < 0.5) return false;
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
    && Array.isArray(trace.provenance)
    && trace.provenance.length > 0
    && trace.provenance.every(ref => typeof ref === "string" && ref.trim().length > 0),
  );
}

export type KnowledgeStatus = "active" | "done" | "blocked" | "superseded" | "historical";
export type RetrievalTier = "hot-state" | "structured-index" | "pattern-hop" | "raw-archive";

export interface TemporalKnowledge<T = unknown> {
  key: string;
  value: T;
  status: KnowledgeStatus;
  assertedAt: string;
  validFrom?: string;
  validUntil?: string;
  lastVerifiedAt?: string;
  supersedes?: string[];
  provenance: string[];
  confidence: number;
}

export interface ResolvedKnowledge<T = unknown> {
  current?: TemporalKnowledge<T>;
  history: TemporalKnowledge<T>[];
  conflicts: TemporalKnowledge<T>[];
}

const time = (v?: string) => v ? Date.parse(v) : Number.NaN;
const stamp = (v: TemporalKnowledge) => time(v.lastVerifiedAt) || time(v.assertedAt) || 0;

function isTemporallyValid(v: TemporalKnowledge, now: number): boolean {
  const from = time(v.validFrom);
  const until = time(v.validUntil);
  return (!Number.isFinite(from) || from <= now) && (!Number.isFinite(until) || now < until);
}

/**
 * Resolve state without assuming "newest = truth". Explicit supersession and
 * lifecycle status outrank historical assertions; confidence only breaks ties.
 */
export function resolveTemporalKnowledge<T>(
  candidates: TemporalKnowledge<T>[],
  now = Date.now(),
): ResolvedKnowledge<T> {
  const byKey = new Map(candidates.map((c) => [c.key, c]));
  const superseded = new Set(candidates.flatMap((c) => c.supersedes ?? []));
  const eligible = candidates.filter((c) =>
    !superseded.has(c.key) &&
    c.status !== "superseded" &&
    c.status !== "historical" &&
    isTemporallyValid(c, now)
  );

  eligible.sort((a, b) => {
    const lifecycle = (s: KnowledgeStatus) => s === "done" ? 4 : s === "blocked" ? 3 : s === "active" ? 2 : 1;
    return lifecycle(b.status) - lifecycle(a.status)
      || stamp(b) - stamp(a)
      || b.confidence - a.confidence;
  });

  const current = eligible[0];
  const conflicts = current
    ? eligible.slice(1).filter((c) => c.status !== current.status || c.value !== current.value)
    : [];

  const history = candidates
    .filter((c) => c !== current)
    .sort((a, b) => stamp(b) - stamp(a));

  // Keep this lookup explicit: callers may inspect supersession lineage.
  void byKey;
  return { current, history, conflicts };
}

export function retrievalEscalationPlan(): readonly RetrievalTier[] {
  return ["hot-state", "structured-index", "pattern-hop", "raw-archive"] as const;
}

export function nextRetrievalTier(
  attempted: readonly RetrievalTier[],
  sufficient: boolean,
): RetrievalTier | null {
  if (sufficient) return null;
  return retrievalEscalationPlan().find((tier) => !attempted.includes(tier)) ?? null;
}

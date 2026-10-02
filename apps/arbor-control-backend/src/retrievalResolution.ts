export type KnowledgeStatus =
  | "active"
  | "done"
  | "blocked"
  | "superseded"
  | "historical";

export type RetrievalTier =
  | "hot-state"
  | "structured-index"
  | "pattern-hop"
  | "raw-archive";

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

const time = (value?: string) =>
  value ? Date.parse(value) : Number.NaN;

const stamp = (value: TemporalKnowledge) =>
  time(value.lastVerifiedAt) || time(value.assertedAt) || 0;

function isTemporallyValid(
  value: TemporalKnowledge,
  now: number,
): boolean {
  const from = time(value.validFrom);
  const until = time(value.validUntil);

  return (
    (!Number.isFinite(from) || from <= now) &&
    (!Number.isFinite(until) || now < until)
  );
}

/**
 * Resolve one logical fact/state family without assuming "newest = truth".
 * Explicit supersession and lifecycle outrank chronology; confidence is only
 * a tie-breaker. Callers must group semantically related candidates first.
 */
export function resolveTemporalKnowledge<T>(
  candidates: TemporalKnowledge<T>[],
  now = Date.now(),
): ResolvedKnowledge<T> {
  const superseded = new Set(
    candidates.flatMap((candidate) => candidate.supersedes ?? []),
  );

  const eligible = candidates.filter(
    (candidate) =>
      !superseded.has(candidate.key) &&
      candidate.status !== "superseded" &&
      candidate.status !== "historical" &&
      isTemporallyValid(candidate, now),
  );

  eligible.sort((a, b) => {
    const lifecycle = (status: KnowledgeStatus) =>
      status === "done"
        ? 4
        : status === "blocked"
          ? 3
          : status === "active"
            ? 2
            : 1;

    return (
      lifecycle(b.status) - lifecycle(a.status) ||
      stamp(b) - stamp(a) ||
      b.confidence - a.confidence
    );
  });

  const current = eligible[0];
  const conflicts = current
    ? eligible
        .slice(1)
        .filter(
          (candidate) =>
            candidate.status !== current.status ||
            candidate.value !== current.value,
        )
    : [];

  const history = candidates
    .filter((candidate) => candidate !== current)
    .sort((a, b) => stamp(b) - stamp(a));

  return { current, history, conflicts };
}

export function retrievalEscalationPlan(): readonly RetrievalTier[] {
  return [
    "hot-state",
    "structured-index",
    "pattern-hop",
    "raw-archive",
  ] as const;
}

export function nextRetrievalTier(
  attempted: readonly RetrievalTier[],
  sufficient: boolean,
): RetrievalTier | null {
  if (sufficient) return null;
  return (
    retrievalEscalationPlan().find(
      (tier) => !attempted.includes(tier),
    ) ?? null
  );
}

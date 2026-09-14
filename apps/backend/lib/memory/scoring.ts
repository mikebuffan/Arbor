export type ScoredMemory = {
  similarity?: number;
  importance?: number | null;
  confidence?: number | null;
  last_seen_at?: string | null;
  last_reinforced_at?: string | null;
  updated_at?: string | null;
};

function clamp01(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

export function memoryRecencyScore(
  iso?: string | null,
  halfLifeDays = 30,
): number {
  if (!iso) return 0.2;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return 0.2;

  const ageDays = Math.max(0, Date.now() - ts) / 86_400_000;
  const lambda = Math.log(2) / Math.max(1, halfLifeDays);
  return clamp01(Math.exp(-lambda * ageDays), 0.2);
}

export function hybridMemoryScore(item: ScoredMemory): number {
  const similarity = clamp01(Number(item.similarity ?? 0));
  const importance = clamp01(Number(item.importance ?? 5) / 10, 0.5);
  const confidence = clamp01(Number(item.confidence ?? 0.7), 0.7);
  const recency = memoryRecencyScore(
    item.last_reinforced_at ?? item.last_seen_at ?? item.updated_at ?? null,
  );

  // Recovered Arbor weighting: semantic relevance leads; durable importance,
  // recency, and confidence stabilize the result.
  return (
    similarity * 0.55 +
    importance * 0.20 +
    recency * 0.15 +
    confidence * 0.10
  );
}

export function rerankMemoryItems<T extends ScoredMemory>(
  rows: T[],
  limit: number,
): T[] {
  return [...rows]
    .map((row) => ({ row, score: hybridMemoryScore(row) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit))
    .map(({ row }) => row);
}

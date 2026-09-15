export type PatternMergeRow = {
  id: string;
  key: string;
  value: unknown;
  memory_kind: string | null;
  confidence?: number | null;
  salience?: number | null;
  recurrence_count?: number | null;
  status?: string | null;
};

export function normalizePatternText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/[^a-z0-9\s:@._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scalarStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) return value.flatMap(scalarStrings);
  if (!value || typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap(scalarStrings);
}

export function patternComparableText(input: {
  key: string;
  value: unknown;
}): string {
  return normalizePatternText(
    [input.key.replace(/[._-]/g, " "), ...scalarStrings(input.value)]
      .filter(Boolean)
      .join(" "),
  );
}

export function patternTextSimilarity(a: string, b: string): number {
  const aa = new Set(
    normalizePatternText(a)
      .split(" ")
      .filter(Boolean),
  );
  const bb = new Set(
    normalizePatternText(b)
      .split(" ")
      .filter(Boolean),
  );

  if (!aa.size || !bb.size) return 0;

  let overlap = 0;
  for (const token of aa) {
    if (bb.has(token)) overlap += 1;
  }

  const union = new Set([...aa, ...bb]).size || 1;
  return overlap / union;
}

export function findPatternHopTarget(params: {
  incomingKey: string;
  incomingValue: unknown;
  rows: PatternMergeRow[];
  threshold?: number;
}): PatternMergeRow | null {
  const threshold = params.threshold ?? 0.72;

  const exact = params.rows.find(
    (row) => row.key === params.incomingKey,
  );
  if (exact) return exact;

  const incomingText = patternComparableText({
    key: params.incomingKey,
    value: params.incomingValue,
  });

  let best: { row: PatternMergeRow; score: number } | null = null;

  for (const row of params.rows) {
    if (
      row.memory_kind !== "pattern_candidate" &&
      row.memory_kind !== "pattern"
    ) {
      continue;
    }

    const score = patternTextSimilarity(
      incomingText,
      patternComparableText({
        key: row.key,
        value: row.value,
      }),
    );

    if (
      score >= threshold &&
      (!best || score > best.score)
    ) {
      best = { row, score };
    }
  }

  return best?.row ?? null;
}

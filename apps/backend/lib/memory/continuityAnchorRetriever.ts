import type { RetrievedMemoryItem } from "@/lib/memory/retrieval";

const STOPWORDS = new Set([
  "about","after","again","also","been","being","could","does","from","have",
  "into","just","more","most","that","their","them","then","there","these",
  "they","this","those","what","when","where","which","while","with","would",
  "your","youre","remember","continue","continued","continuing",
]);

const CONTINUITY_CUES = [
  "remember",
  "continue",
  "keep going",
  "go back",
  "where were we",
  "pick back up",
  "again",
  "we already",
  "you already",
  "last time",
  "before",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9._\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function terms(text: string): Set<string> {
  return new Set(
    normalize(text)
      .replace(/[._-]/g, " ")
      .split(" ")
      .map((term) => term.trim())
      .filter((term) => term.length >= 3 && !STOPWORDS.has(term)),
  );
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const value of a) {
    if (b.has(value)) overlap += 1;
  }
  return overlap / Math.max(1, Math.min(a.size, b.size));
}

export function isContinuityCue(userText: string): boolean {
  const text = normalize(userText);
  return CONTINUITY_CUES.some((cue) => text.includes(cue));
}

export function continuityAnchorScore(
  item: RetrievedMemoryItem,
  userText: string,
): number {
  const userTerms = terms(userText);
  const memoryTerms = terms(
    [item.key, item.content_text].filter(Boolean).join(" "),
  );

  const overlap = overlapScore(userTerms, memoryTerms);
  const similarity = Math.max(0, Math.min(1, Number(item.similarity ?? 0)));
  const importance = Math.max(
    0,
    Math.min(1, Number(item.importance ?? 5) / 10),
  );
  const confidence = Math.max(
    0,
    Math.min(1, Number(item.confidence ?? 0.7)),
  );

  let score =
    similarity * 0.45 +
    overlap * 0.30 +
    importance * 0.15 +
    confidence * 0.10;

  if (item.pinned || item.locked || item.tier === "core") {
    score += 0.35;
  }

  const key = item.key.toLowerCase();
  if (
    isContinuityCue(userText) &&
    (
      key.includes("ongoing") ||
      key.includes("current") ||
      key.includes("project") ||
      key.includes("relationship") ||
      key.includes("correction") ||
      key.includes("pattern")
    )
  ) {
    score += 0.20;
  }

  return score;
}

/**
 * Final continuity selection gate.
 *
 * Semantic retrieval intentionally pulls a broader candidate set. This step
 * prevents candidate flood by retaining the smallest useful set for the turn.
 * Sensitive/user-trigger-only gating must happen before calling this function.
 */
export function selectContinuityAnchors<T extends RetrievedMemoryItem>(
  items: T[],
  userText: string,
  maxItems = 14,
): T[] {
  if (!items.length || maxItems <= 0) return [];

  return [...items]
    .map((item) => ({
      item,
      score: continuityAnchorScore(item, userText),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.item.updated_at ?? "").localeCompare(
        String(a.item.updated_at ?? ""),
      );
    })
    .slice(0, maxItems)
    .map(({ item }) => item);
}

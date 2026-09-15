export type RetrievalHypothesis = {
  key: string;
  text: string;
  score: number;
};

export type RetrievalRerouteState = {
  rejectedKeys: string[];
  rejectedTerms: string[];
  rejectionCount: number;
};

const REJECTION_PATTERNS = [
  /\b(no|nope)\b/i,
  /\bwrong\s+(thread|thing|one|context|conversation)\b/i,
  /\b(?:not|isn['’]?t|wasn['’]?t|can['’]?t)\s+(?:be\s+)?(?:the\s+)?(?:right\s+)?(?:thread|thing|one|context|conversation)\b/i,
  /\bnot\s+(that|what i mean|what i meant|it)\b/i,
  /\bcome on\b/i,
  /\byou(?:'re| are)\s+(off|wrong)\b/i,
  /\bthat(?:'s| is)\s+not\b/i,
];

function terms(text: string): string[] {
  return Array.from(new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length >= 4),
  ));
}

export function isExplicitRetrievalRejection(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return REJECTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function rejectRetrievalNeighborhood(input: {
  state?: RetrievalRerouteState | null;
  selected: RetrievalHypothesis[];
}): RetrievalRerouteState {
  const prior = input.state ?? {
    rejectedKeys: [],
    rejectedTerms: [],
    rejectionCount: 0,
  };

  return {
    rejectedKeys: Array.from(new Set([
      ...prior.rejectedKeys,
      ...input.selected.map((item) => item.key),
    ])).slice(-40),
    rejectedTerms: Array.from(new Set([
      ...prior.rejectedTerms,
      ...input.selected.flatMap((item) => terms(item.text)),
    ])).slice(-120),
    rejectionCount: prior.rejectionCount + 1,
  };
}

export function rerankAfterRejection(input: {
  candidates: RetrievalHypothesis[];
  state?: RetrievalRerouteState | null;
  currentCue: string;
}): RetrievalHypothesis[] {
  const state = input.state;
  if (!state?.rejectionCount) return [...input.candidates];

  const cueTerms = new Set(terms(input.currentCue));
  const rejectedTerms = new Set(state.rejectedTerms);
  const rejectedKeys = new Set(state.rejectedKeys);

  return input.candidates
    .map((candidate) => {
      const candidateTerms = terms(candidate.text);
      const rejectedOverlap = candidateTerms.filter((term) => rejectedTerms.has(term)).length;
      const freshCueOverlap = candidateTerms.filter((term) => cueTerms.has(term) && !rejectedTerms.has(term)).length;
      const neighborhoodPenalty = rejectedKeys.has(candidate.key)
        ? 0.8
        : Math.min(0.55, rejectedOverlap * 0.08);
      const freshCueBoost = Math.min(0.35, freshCueOverlap * 0.1);

      return {
        ...candidate,
        score: candidate.score - neighborhoodPenalty + freshCueBoost,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function buildRerouteInstruction(state?: RetrievalRerouteState | null): string {
  if (!state?.rejectionCount) return "";

  return [
    "RETRIEVAL REROUTE ACTIVE.",
    "The user explicitly rejected the previous interpretation.",
    "Do not reinterpret the user's next cue through the rejected retrieval neighborhood.",
    "Treat the correction as evidence that the current hypothesis is wrong, suppress that neighborhood temporarily, broaden associative retrieval, and pattern-hop to materially different context clusters.",
    "A rejection is retrieval-control evidence only: do not delete or rewrite otherwise valid durable memories merely because this interpretation was rejected.",
    "Prefer a new hypothesis that explains all current cues. If evidence remains ambiguous, say what is uncertain rather than fabricating continuity.",
  ].join("\n");
}

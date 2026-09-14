export type ArborEvidenceClass =
  | "established"
  | "observed"
  | "implemented"
  | "designed"
  | "proposed"
  | "unknown"
  | "not_recovered";

export type ArborEvidenceRef = {
  sourceId: string;
  originId: string;
  evidenceClass: ArborEvidenceClass;
  confidence: number;
};

export function normalizeEvidenceRef(
  input: ArborEvidenceRef,
): ArborEvidenceRef {
  const sourceId = input.sourceId.trim();
  const originId = input.originId.trim();

  if (!sourceId) {
    throw new Error("evidence_source_required");
  }
  if (!originId) {
    throw new Error("evidence_origin_required");
  }
  if (
    !Number.isFinite(input.confidence) ||
    input.confidence < 0 ||
    input.confidence > 1
  ) {
    throw new Error("evidence_confidence_invalid");
  }

  return {
    sourceId,
    originId,
    evidenceClass: input.evidenceClass,
    confidence: input.confidence,
  };
}

/**
 * Independent proof is counted by origin, not by the number of copies,
 * summaries, exports, or files that repeat the same underlying event.
 */
export function independentOrigins(
  evidence: ArborEvidenceRef[],
): string[] {
  return Array.from(
    new Set(
      evidence.map((item) =>
        normalizeEvidenceRef(item).originId,
      ),
    ),
  ).sort();
}

export function hasIndependentSupport(
  evidence: ArborEvidenceRef[],
  options: {
    minEvents?: number;
    minOrigins?: number;
    minConfidence?: number;
  } = {},
): boolean {
  const minEvents = options.minEvents ?? 3;
  const minOrigins = options.minOrigins ?? 2;
  const minConfidence = options.minConfidence ?? 0.75;

  const supporting = evidence
    .map(normalizeEvidenceRef)
    .filter((item) =>
      item.confidence >= minConfidence &&
      item.evidenceClass !== "unknown" &&
      item.evidenceClass !== "not_recovered" &&
      item.evidenceClass !== "proposed",
    );

  return (
    supporting.length >= minEvents &&
    independentOrigins(supporting).length >= minOrigins
  );
}

export function assertEvidenceStateDistinction(
  evidenceClass: ArborEvidenceClass,
): void {
  if (
    evidenceClass !== "unknown" &&
    evidenceClass !== "not_recovered"
  ) {
    return;
  }

  // Deliberately no coercion. `unknown` means not known; `not_recovered` means
  // evidence is expected/historical but has not been recovered. They remain
  // separate states so absence of retrieval never turns into a factual claim.
}

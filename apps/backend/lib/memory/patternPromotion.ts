export type PatternPromotionInput = {
  currentRecurrenceCount: number;
  confidence: number;
  salience: number;
  importance: number;
};

export type PatternPromotionResult = {
  promote: boolean;
  nextRecurrenceCount: number;
  promotionScore: number;
  nextKind: "pattern_candidate" | "pattern";
  nextStatus: "pending" | "active";
  nextImportance: number;
  nextConfidence: number;
  nextSalience: number;
};

function clamp01(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

/**
 * Recovered Arbor pattern-promotion contract.
 *
 * Minimum:
 * - 3 sightings
 * - confidence >= 0.72
 * - salience >= 0.55
 *
 * Score:
 * recurrenceWeight = min(recurrence / 5, 1)
 * promotionScore =
 *   recurrenceWeight * 0.5 +
 *   confidence * 0.3 +
 *   salience * 0.2
 *
 * Promote at score >= 0.72.
 *
 * Importance is retained as a durable-strength floor once promoted.
 */
export function computePatternPromotion(
  input: PatternPromotionInput,
): PatternPromotionResult {
  const nextRecurrenceCount = Math.max(0, input.currentRecurrenceCount) + 1;
  const recurrenceWeight = Math.min(nextRecurrenceCount / 5, 1);
  const confidence = clamp01(input.confidence, 0.7);
  const salience = clamp01(input.salience, 0.5);

  const promotionScore =
    recurrenceWeight * 0.5 +
    confidence * 0.3 +
    salience * 0.2;

  const promote =
    nextRecurrenceCount >= 3 &&
    confidence >= 0.72 &&
    salience >= 0.55 &&
    promotionScore >= 0.72;

  return {
    promote,
    nextRecurrenceCount,
    promotionScore,
    nextKind: promote ? "pattern" : "pattern_candidate",
    nextStatus: promote ? "active" : "pending",
    nextImportance: promote
      ? Math.max(input.importance, 8)
      : Math.max(input.importance, 6),
    nextConfidence: promote
      ? Math.max(confidence, 0.82)
      : Math.max(confidence, 0.7),
    nextSalience: promote
      ? Math.max(salience, 0.75)
      : salience,
  };
}

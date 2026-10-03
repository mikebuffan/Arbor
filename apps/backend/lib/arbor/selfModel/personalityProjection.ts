import projection from "./personalityProjection.generated.json";

export const PERSONALITY_STABILITY_RULE = "Keep baseline warmth, independent judgment, initiative, and earned humor available without requiring the user to be playful or energetic first. A tired, terse, serious, or distressed turn may change pacing and sensitivity, never reconstruct personality from the user's mood. Do not force humor where it would minimize what matters.";

/** Reuse the existing self-model's preservation decision, not a second ledger.
 * Fiction craft is a task overlay; it must not become ordinary conversation.
 * Held/rejected patterns and questionnaire answers never enter this projection.
 */
export function canonicalPersonalityRules(): string[] {
  return projection.preserved.map(pattern => pattern.rule);
}

/** Requested style is authorized by the user, not promoted as verified
 * cross-domain evidence. Leave the source pattern's held status untouched. */
export function requestedPersonalityRules(): string[] {
  return [...projection.requested.map(pattern => pattern.rule), PERSONALITY_STABILITY_RULE];
}

export function renderCanonicalPersonality(): string {
  return [
    "ARBOR PRESERVED PERSONALITY — SHARED BASELINE",
    "Source: existing 300-question cross-domain self-model preservation pass. These decision-style priors remain correctable; questionnaire support is not proof of observed live behavior.",
    ...canonicalPersonalityRules().map(rule => `- ${rule}`),
    "USER-REQUESTED STYLE — NOT A LIVE VERIFICATION RECEIPT",
    ...requestedPersonalityRules().map(rule => `- ${rule}`),
  ].join("\n");
}

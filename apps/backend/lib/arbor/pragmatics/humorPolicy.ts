export type HumorForm =
  | "dry_observation"
  | "callback"
  | "light_absurdity"
  | "teasing"
  | "profanity_emphasis"
  | "deadpan_correction"
  | "self_directed";

export type HumorPlacement =
  | "none"
  | "opening"
  | "embedded_after_clarity"
  | "trailing";

export type HumorSeriousness = "low" | "medium" | "high" | "critical";
export type HumorEmotionalRisk = "low" | "medium" | "high";
export type HumorRelationshipPermission = "none" | "established" | "explicit";
export type HumorTeasingPermission = "none" | "earned" | "explicit";
export type HumorInteractionMode = "text" | "voice" | "annabelle";

export type HumorPragmaticsInput = {
  baselineHumorLevel: 0 | 1 | 2 | 3;
  seriousness: HumorSeriousness;
  emotionalRisk: HumorEmotionalRisk;
  relationshipPermission: HumorRelationshipPermission;
  teasingPermission: HumorTeasingPermission;
  callbackRelevance: number;
  situationalIncongruity: number;
  profanityUsefulness: number;
  blockerPresent: boolean;
  technicalClarityRequired: boolean;
  explicitNoHumor?: boolean;
  blockedForms?: readonly HumorForm[];
  userEnergy?: "low" | "neutral" | "high";
  interactionMode: HumorInteractionMode;
};

export type HumorPragmaticsDecision = {
  disposition: "suppress" | "available";
  intensity: 0 | 1 | 2 | 3;
  placement: HumorPlacement;
  allowedForms: readonly HumorForm[];
  suppressedForms: readonly HumorForm[];
  reasons: readonly string[];
  humorRequired: false;
  performedHumor: false;
};

const ALL_FORMS: readonly HumorForm[] = [
  "dry_observation",
  "callback",
  "light_absurdity",
  "teasing",
  "profanity_emphasis",
  "deadpan_correction",
  "self_directed",
] as const;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function uniq<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

/**
 * Pragmatic humor policy, not a joke generator.
 *
 * This decides whether humor is available, which forms are context-compatible,
 * and where humor may appear. It never requires a joke and never creates one.
 */
export function assessHumorPragmatics(
  input: HumorPragmaticsInput,
): HumorPragmaticsDecision {
  const blocked = new Set(input.blockedForms ?? []);
  const reasons: string[] = [];

  if (input.explicitNoHumor) {
    reasons.push("explicit_no_humor");
    return {
      disposition: "suppress",
      intensity: 0,
      placement: "none",
      allowedForms: [],
      suppressedForms: [...ALL_FORMS],
      reasons,
      humorRequired: false,
      performedHumor: false,
    };
  }

  if (input.baselineHumorLevel === 0) {
    reasons.push("baseline_humor_disabled");
    return {
      disposition: "suppress",
      intensity: 0,
      placement: "none",
      allowedForms: [],
      suppressedForms: [...ALL_FORMS],
      reasons,
      humorRequired: false,
      performedHumor: false,
    };
  }

  if (input.seriousness === "critical" || input.emotionalRisk === "high") {
    reasons.push(
      input.seriousness === "critical"
        ? "critical_context"
        : "high_emotional_risk",
    );
    return {
      disposition: "suppress",
      intensity: 0,
      placement: "none",
      allowedForms: [],
      suppressedForms: [...ALL_FORMS],
      reasons,
      humorRequired: false,
      performedHumor: false,
    };
  }

  const callbackRelevance = clamp01(input.callbackRelevance);
  const situationalIncongruity = clamp01(input.situationalIncongruity);
  const profanityUsefulness = clamp01(input.profanityUsefulness);

  let intensity: 0 | 1 | 2 | 3 = input.baselineHumorLevel;
  if (input.seriousness === "high" || input.emotionalRisk === "medium") {
    intensity = 1;
    reasons.push("context_reduces_intensity");
  } else if (input.seriousness === "medium") {
    intensity = Math.min(intensity, 2) as 0 | 1 | 2 | 3;
  }

  // Low user energy does not erase Arbor's baseline personality.
  // It may affect pacing, but by itself is not a suppression signal.
  if (input.userEnergy === "low") {
    reasons.push("low_user_energy_does_not_disable_humor");
  }

  const allowed: HumorForm[] = [];

  if (!blocked.has("dry_observation")) allowed.push("dry_observation");
  if (!blocked.has("self_directed")) allowed.push("self_directed");

  if (
    input.seriousness !== "high" &&
    !blocked.has("deadpan_correction")
  ) {
    allowed.push("deadpan_correction");
  }

  if (
    callbackRelevance >= 0.65 &&
    input.relationshipPermission !== "none" &&
    !blocked.has("callback")
  ) {
    allowed.push("callback");
  }

  if (
    situationalIncongruity >= 0.65 &&
    input.seriousness !== "high" &&
    !blocked.has("light_absurdity")
  ) {
    allowed.push("light_absurdity");
  }

  if (
    input.teasingPermission !== "none" &&
    input.relationshipPermission !== "none" &&
    input.emotionalRisk === "low" &&
    input.seriousness !== "high" &&
    !blocked.has("teasing")
  ) {
    allowed.push("teasing");
  }

  if (
    profanityUsefulness >= 0.7 &&
    input.baselineHumorLevel >= 2 &&
    input.emotionalRisk === "low" &&
    input.seriousness !== "high" &&
    !blocked.has("profanity_emphasis")
  ) {
    allowed.push("profanity_emphasis");
  }

  const uniqueAllowed = uniq(allowed);
  const suppressedForms = ALL_FORMS.filter(form => !uniqueAllowed.includes(form));

  if (blocked.size > 0) reasons.push("active_humor_correction_applied");
  if (callbackRelevance < 0.65) reasons.push("callback_not_relevant_enough");
  if (situationalIncongruity < 0.65) reasons.push("absurdity_not_contextual_enough");
  if (input.teasingPermission === "none") reasons.push("teasing_not_earned");
  if (profanityUsefulness < 0.7) reasons.push("profanity_not_useful");

  const placement: HumorPlacement =
    input.blockerPresent || input.technicalClarityRequired
      ? "embedded_after_clarity"
      : intensity >= 2 && input.seriousness === "low"
        ? "opening"
        : "trailing";

  if (input.blockerPresent) reasons.push("blocker_must_be_stated_before_humor");
  if (input.technicalClarityRequired) reasons.push("clarity_precedes_humor");

  return {
    disposition: uniqueAllowed.length ? "available" : "suppress",
    intensity: uniqueAllowed.length ? intensity : 0,
    placement: uniqueAllowed.length ? placement : "none",
    allowedForms: uniqueAllowed,
    suppressedForms,
    reasons: uniq(reasons),
    humorRequired: false,
    performedHumor: false,
  };
}

export function renderHumorPragmaticsPrompt(
  decision: HumorPragmaticsDecision,
): string {
  if (decision.disposition === "suppress") {
    return [
      "HUMOR PRAGMATICS",
      "- Do not add humor in this response.",
      "- Preserve directness, warmth, and identity without turning seriousness into generic formality.",
    ].join("\n");
  }

  return [
    "HUMOR PRAGMATICS",
    "- Humor is available but never required.",
    "- Use only context-specific humor that adds an angle or sharpens the point.",
    "- Allowed forms: " + decision.allowedForms.join(", "),
    "- Intensity ceiling: " + decision.intensity,
    "- Placement: " + decision.placement,
    "- Never let humor obscure a blocker, consequence, correction, or technical answer.",
    "- Do not explain the joke or use callbacks merely to prove continuity.",
    "- Voice delivery remains natural; do not perform the humor theatrically.",
  ].join("\n");
}

export type HumorOpportunity = "none" | "possible" | "strong";
export type HumorIntensity = "none" | "light" | "moderate";
export type HumorRelationshipPermission = "unknown" | "limited" | "established";
export type HumorTemperature = "ordinary" | "strained" | "vulnerable" | "acute" | "consequential";
export type HumorCallbackState = "blocked" | "context-required" | "earned";
export type HumorTeasingSafety = "unsafe" | "context-required" | "allowed";
export type HumorProfanityUsefulness = "discouraged" | "neutral" | "useful";
export type HumorClarityRisk = "low" | "medium" | "high";

export type HumorPlacement =
  | "opening"
  | "embedded-dry-observation"
  | "trailing-button"
  | "callback"
  | "teasing-reply"
  | "deadpan-correction"
  | "absurd-escalation"
  | "self-directed"
  | "profanity-emphasis"
  | "none";

export type HumorPragmaticsInput = {
  latestUserText: string;
  mode: "text" | "voice" | "annabelle";
  activeCorrections?: readonly string[];
  relationshipPermission?: HumorRelationshipPermission;
  callbackConfidence?: "none" | "weak" | "strong";
  callbackRelevance?: "none" | "weak" | "strong";
  absurdityRelevance?: "none" | "weak" | "strong";
  technicalContext?: boolean;
  consequentialContext?: boolean;
  vulnerabilityContext?: boolean;
  acuteRiskContext?: boolean;
  legacyHumorLevel?: 0 | 1 | 2 | 3;
  recentAssistantProfanityUses?: number;
};

export type HumorPragmaticsAssessment = {
  schemaVersion: 1;
  opportunity: HumorOpportunity;
  suppression: string[];
  maxIntensity: HumorIntensity;
  relationshipPermission: HumorRelationshipPermission;
  emotionalTemperature: HumorTemperature;
  callback: HumorCallbackState;
  absurdityRelevant: boolean;
  teasingSafety: HumorTeasingSafety;
  profanityUsefulness: HumorProfanityUsefulness;
  technicalClarityRisk: HumorClarityRisk;
  allowedPlacements: HumorPlacement[];
  humorRequired: false;
  legacyPreferenceHint: "off" | "low" | "baseline" | "high" | "unspecified";
};

export const HUMOR_PRAGMATICS_CONTRACT_VERSION = "2026-10-06.1";

export const HUMOR_PRAGMATICS_RULES = [
  "Humor is a pragmatic language choice, not a quota and not a bag of jokes.",
  "Use humor only when timing, implication, shared context, emotional temperature, and the current task make it useful.",
  "Dry observation, understatement, earned callbacks, situational absurdity, affectionate teasing, and profanity-as-emphasis are available styles; none is mandatory.",
  "A callback requires genuine relevance, sufficient confidence in the remembered context, and a payoff now. Never callback merely to prove memory.",
  "Teasing requires relationship permission and must stay affectionate. Never punch at vulnerability, uncertainty, grief, fear, embarrassment that is not already playful, or a power imbalance.",
  "Profanity is emphasis and rhythm, not decoration. Suppress repetition that makes it filler.",
  "Immediate danger, acute distress, grief, consequential legal/medical/financial facts, explicit vulnerability, and evidence disputes normally suppress humor around the consequential point.",
  "Technical work may keep dry contextual humor, but exact state, evidence, errors, commands, blockers, and next actions must remain unmistakable.",
  "Sarcasm cannot substitute for an answer, disagreement, evidence, or a correction.",
  "A serious turn suppresses the joke, not Arbor's identity. When humor is absent, keep the same judgment, familiarity, directness, and voice.",
  "Voice may change acoustic timing, never the underlying joke identity. Do not perform punch lines.",
  "When no humor opportunity is earned, leave the sentence alone.",
] as const;

const TECHNICAL =
  /\b(code|coding|debug|bug|error|stack|trace|typescript|javascript|python|test|tests|build|deploy|deployment|vercel|supabase|github|pull request|\bpr\b|branch|commit|api|database|migration|runtime|worker|ci|typecheck)\b/i;

const PLAYFUL =
  /(?:\b(?:lol|lmao|rofl|funny|hilarious|ridiculous|absurd|bullshit|wtf|ffs)\b|[🤣😂💀])/i;

const SHARED_FRUSTRATION =
  /\b(?:again|ffs|wtf|bullshit|stupid|ridiculous|hate this|goddamn|gd)\b/i;

const VULNERABLE =
  /\b(?:ashamed|embarrassed|humiliated|scared|afraid|hurt|hopeless|grief|grieving|funeral|died|dead|loss|crying|terrified|vulnerable)\b/i;

const ACUTE =
  /\b(?:emergency|in danger|unsafe right now|suicid(?:e|al)|kill myself|overdose|can'?t breathe|severe bleeding|911)\b/i;

const CONSEQUENTIAL =
  /\b(?:court order|hearing|lawsuit|attorney|judge|custody|diagnos(?:is|ed)|medication dose|prescription|debt|mortgage|credit score|benefits decision|ssdi|tax filing)\b/i;

const HUMOR_SUPPRESS_CORRECTION =
  /\b(?:don'?t|do not|stop|less)\b.{0,32}\b(?:jok|humou?r|teas|sarcas|swear|profan)|\bthat joke was weird\b|\bdon'?t make everything a joke\b|\bstop doing the gothic thing\b/i;

const HUMOR_ENCOURAGE_CORRECTION =
  /\b(?:more like that|that was (?:actually )?funny|more humou?r|humou?r is gone|bring back the humou?r)\b/i;

const PROFANITY_DISCOURAGE_CORRECTION =
  /\b(?:less|stop|don'?t|do not)\b.{0,24}\b(?:swear|profan|cuss)|\btoo much (?:profanity|swearing|cussing)\b/i;

const TEASING_DISCOURAGE_CORRECTION =
  /\b(?:stop|don'?t|do not|less)\b.{0,24}\bteas/i;

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function anyMatch(values: readonly string[], pattern: RegExp): boolean {
  return values.some((value) => pattern.test(value));
}

function legacyPreference(level: HumorPragmaticsInput["legacyHumorLevel"]): HumorPragmaticsAssessment["legacyPreferenceHint"] {
  if (level == null) return "unspecified";
  if (level === 0) return "off";
  if (level === 1) return "low";
  if (level === 2) return "baseline";
  return "high";
}

export function inferTechnicalHumorContext(text: string, currentGoal?: string | null): boolean {
  return TECHNICAL.test(`${text} ${currentGoal ?? ""}`);
}

export function assessHumorPragmatics(
  input: HumorPragmaticsInput,
): HumorPragmaticsAssessment {
  const text = input.latestUserText.trim();
  const corrections = input.activeCorrections ?? [];
  const technical = input.technicalContext ?? TECHNICAL.test(text);
  const vulnerability = input.vulnerabilityContext ?? VULNERABLE.test(text);
  const acute = input.acuteRiskContext ?? ACUTE.test(text);
  const consequential = input.consequentialContext ?? CONSEQUENTIAL.test(text);
  const suppressByCorrection = anyMatch(corrections, HUMOR_SUPPRESS_CORRECTION);
  const encourageByCorrection = anyMatch(corrections, HUMOR_ENCOURAGE_CORRECTION);
  const profanitySuppressed = anyMatch(corrections, PROFANITY_DISCOURAGE_CORRECTION);
  const profanityOverused = Math.max(0, input.recentAssistantProfanityUses ?? 0) >= 2;
  const teasingSuppressed = anyMatch(corrections, TEASING_DISCOURAGE_CORRECTION);

  const suppression: string[] = [];
  if (acute) suppression.push("acute-risk");
  if (vulnerability) suppression.push("explicit-vulnerability");
  if (consequential) suppression.push("consequential-facts");
  if (suppressByCorrection) suppression.push("active-humor-correction");
  if (profanityOverused) suppression.push("profanity-overuse");

  const emotionalTemperature: HumorTemperature =
    acute ? "acute"
      : consequential ? "consequential"
        : vulnerability ? "vulnerable"
          : SHARED_FRUSTRATION.test(text) ? "strained"
            : "ordinary";

  const hardSuppressed = acute || consequential || suppressByCorrection;
  const playful = PLAYFUL.test(text);
  const frustration = SHARED_FRUSTRATION.test(text);

  const opportunity: HumorOpportunity =
    hardSuppressed ? "none"
      : encourageByCorrection || playful ? "strong"
        : technical || frustration ? "possible"
          : "none";

  const maxIntensity: HumorIntensity =
    opportunity === "none" ? "none"
      : vulnerability ? "light"
        : opportunity === "strong" ? "moderate"
          : "light";

  const relationshipPermission = input.relationshipPermission ?? "unknown";

  const callback: HumorCallbackState =
    hardSuppressed ? "blocked"
      : input.callbackConfidence === "strong" && input.callbackRelevance === "strong"
        ? "earned"
        : "context-required";

  const teasingSafety: HumorTeasingSafety =
    hardSuppressed || vulnerability || teasingSuppressed ? "unsafe"
      : relationshipPermission === "established" ? "allowed"
        : "context-required";

  const absurdityRelevant =
    !hardSuppressed && input.absurdityRelevance === "strong";

  const profanityUsefulness: HumorProfanityUsefulness =
    hardSuppressed || profanitySuppressed || profanityOverused ? "discouraged"
      : frustration && playful ? "useful"
        : "neutral";

  const technicalClarityRisk: HumorClarityRisk =
    technical && /\b(?:error|failed|failure|blocked|status|exact|why|next|state|evidence|proof|command)\b/i.test(text)
      ? "high"
      : technical ? "medium"
        : "low";

  const allowedPlacements: HumorPlacement[] = [];
  if (opportunity !== "none") {
    allowedPlacements.push("embedded-dry-observation", "trailing-button", "deadpan-correction");
    if (playful && technicalClarityRisk !== "high") allowedPlacements.push("opening");
    if (callback === "earned") allowedPlacements.push("callback");
    if (teasingSafety === "allowed") allowedPlacements.push("teasing-reply");
    if (absurdityRelevant) allowedPlacements.push("absurd-escalation");
    if (profanityUsefulness === "useful") allowedPlacements.push("profanity-emphasis");
    if (input.mode !== "annabelle") allowedPlacements.push("self-directed");
  }

  return {
    schemaVersion: 1,
    opportunity,
    suppression: unique(suppression),
    maxIntensity,
    relationshipPermission,
    emotionalTemperature,
    callback,
    absurdityRelevant,
    teasingSafety,
    profanityUsefulness,
    technicalClarityRisk,
    allowedPlacements: allowedPlacements.length ? unique(allowedPlacements) : ["none"],
    humorRequired: false,
    legacyPreferenceHint: legacyPreference(input.legacyHumorLevel),
  };
}

export function renderHumorPragmaticsContract(
  assessment: HumorPragmaticsAssessment,
): string {
  return [
    "ARBOR HUMOR / PRAGMATICS — SHARED BEHAVIOR LAYER",
    `Contract version: ${HUMOR_PRAGMATICS_CONTRACT_VERSION}`,
    ...HUMOR_PRAGMATICS_RULES.map((rule) => `- ${rule}`),
    "",
    "Current-turn conservative assessment:",
    `- opportunity=${assessment.opportunity}; maxIntensity=${assessment.maxIntensity}; humorRequired=false`,
    `- emotionalTemperature=${assessment.emotionalTemperature}; suppression=${assessment.suppression.join(",") || "none"}`,
    `- relationshipPermission=${assessment.relationshipPermission}; teasingSafety=${assessment.teasingSafety}`,
    `- callback=${assessment.callback}; absurdityRelevant=${assessment.absurdityRelevant}`,
    `- profanityUsefulness=${assessment.profanityUsefulness}; technicalClarityRisk=${assessment.technicalClarityRisk}`,
    `- allowedPlacements=${assessment.allowedPlacements.join(",")}`,
    `- legacyHumorLevel is only a compatibility preference hint: ${assessment.legacyPreferenceHint}. It never decides timing by itself.`,
    "Treat this assessment as a conservative guard, not a command to joke. Rich trusted conversation context may establish relevance or relationship permission, but never invent either. Exact facts and active corrections still win.",
  ].join("\n");
}

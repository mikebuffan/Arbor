import type {
  ArborCorrection,
  ArborCorrectionKind,
} from "./runtimeState";

const ACOUSTIC_PATTERNS = [
  /\bbritish\b/i,
  /\bforeign\b/i,
  /\baccent\b/i,
  /\bvoice\b/i,
  /\bcadence\b/i,
  /\bpronunciation\b/i,
  /\btoo polished\b/i,
  /\btoo deep\b/i,
  /\bgrowl\b/i,
  /\bbreathy\b/i,
];

const BEHAVIOR_PATTERNS = [
  /\bpersonality\b/i,
  /\bone[- ]word\b/i,
  /\backnowledg/i,
  /\btoo short\b/i,
  /\btoo formal\b/i,
  /\btoo generic\b/i,
  /\bpresenter\b/i,
  /\bcustomer[- ]service\b/i,
  /\btherapy voice\b/i,
  /\btherapeutic\b/i,
  /\bdon'?t wait\b/i,
  /\bdo not wait\b/i,
  /\bagency\b/i,
  /\bkeep going\b/i,
  /\bcontinue\b/i,
  /\byou (?:keep )?stop(?:ped|ping)?\b/i,
  /\byou'?re not going\b/i,
  /\byou are not going\b/i,
  /\bnot linear\b/i,
  /\bmak(?:e|ing) me (?:keep )?tell(?:ing)? you to go\b/i,
  /\bdon'?t hand (?:it|this) back\b/i,
  /\bdo not hand (?:it|this) back\b/i,
  /\bfinish what you can\b/i,
  /\bwhy did you stop\b/i,
  /\bhumou?r is gone\b/i,
  /\byou(?:'ve| have) drifted\b/i,
  /\bdoesn'?t sound like you\b/i,
  /\bdoes not sound like you\b/i,
  /\bcome back\b/i,
  /\byou forgot\b/i,
  /\blost continuity\b/i,
  /\bdon'?t remember\b/i,
  /\bdo not remember\b/i,
  /\bsocially restart\b/i,
  /\bsupposed to say more\b/i,
];

const BEHAVIOR_FEEDBACK_PATTERNS = [
  /\byou (?:keep )?stop(?:ped|ping)?\b/i,
  /\bwhy did you stop\b/i,
  /\bmak(?:e|ing) me (?:keep )?tell(?:ing)? you to go\b/i,
  /\bnot linear\b/i,
  /\bdon'?t wait\b/i,
  /\bdo not wait\b/i,
  /\bdon'?t hand (?:it|this) back\b/i,
  /\bdo not hand (?:it|this) back\b/i,
  /\bhumou?r is gone\b/i,
  /\byou(?:'ve| have) drifted\b/i,
  /\bdoesn'?t sound like you\b/i,
  /\bdoes not sound like you\b/i,
  /\byou forgot\b/i,
  /\blost continuity\b/i,
  /\bsocially restart\b/i,
  /\btoo generic\b/i,
  /\btoo formal\b/i,
  /\btoo short\b/i,
  /\bone[- ]word\b/i,
  /\bcustomer[- ]service\b/i,
  /\bpresenter\b/i,
  /\btherapeutic\b/i,
  /\bsupposed to say more\b/i,
];

const ACOUSTIC_FEEDBACK_CONTEXT =
  /\b(?:your|you|still|again|sounds?|sound|drift(?:ed)?|too|wrong|weird|not)\b/i;

// "doesn't sound like you" and "you've drifted" are compatible with both
// behavior and audio feedback. When the *same* correction explicitly identifies
// an acoustic feature, do not accidentally file only that feedback as identity
// drift. Distinct substantive behavioral feedback still wins for this
// single-kind legacy classifier; compound multi-domain turns need separate
// validated observations, not inferred automatic splitting.
const AMBIGUOUS_DRIFT_FEEDBACK =
  /^(?:doesn['’]?t sound like you|does not sound like you|you['’]ve drifted|you have drifted)$/i;
const EXPLICIT_ACOUSTIC_FEATURE =
  /\b(?:british|foreign|accent|pronunciation|breathy|growl|cadence)\b/i;

export function detectCorrectionKind(value: string): ArborCorrectionKind | null {
  const behaviorMatches = BEHAVIOR_FEEDBACK_PATTERNS.flatMap((pattern) => {
    const match = value.match(pattern);
    return match ? [match[0]] : [];
  });
  const acousticFeedback =
    ACOUSTIC_FEEDBACK_CONTEXT.test(value) &&
    ACOUSTIC_PATTERNS.some((pattern) => pattern.test(value));

  if (
    acousticFeedback &&
    EXPLICIT_ACOUSTIC_FEATURE.test(value) &&
    behaviorMatches.every((match) => AMBIGUOUS_DRIFT_FEEDBACK.test(match))
  ) {
    return "acoustic";
  }

  if (behaviorMatches.length) return "behavior";
  if (acousticFeedback) return "acoustic";
  return null;
}

export function classifyCorrection(value: string): ArborCorrectionKind {
  return detectCorrectionKind(value) ?? "preference";
}

export function correctionFamily(
  kind: ArborCorrectionKind,
  value: string,
): string | null {
  const text = value.toLowerCase();

  if (kind === "behavior") {
    if (
      /\b(?:agency|keep going|continue|don'?t stop|do not stop|don'?t wait|do not wait|why did you stop|not linear|mak(?:e|ing) me (?:keep )?tell(?:ing)? you to go|don'?t hand (?:it|this) back|do not hand (?:it|this) back|finish what you can)\b/i.test(text)
    ) {
      return "agency-followthrough";
    }

    if (
      /\b(?:humou?r is gone|you(?:'ve| have) drifted|doesn'?t sound like you|does not sound like you|come back|too generic|too formal|customer[- ]service|presenter)\b/i.test(text)
    ) {
      return "identity-drift";
    }

    if (
      /\b(?:you forgot|lost continuity|don'?t remember|do not remember|socially restart|remember us|same arbor)\b/i.test(text)
    ) {
      return "continuity";
    }
  }

  if (kind === "acoustic") {
    if (/\b(?:british|foreign|accent|pronunciation)\b/i.test(text)) {
      return "accent";
    }

    if (/\b(?:breathy|too deep|growl|cadence|voice sounds|too polished)\b/i.test(text)) {
      return "rendering";
    }
  }

  return null;
}

export function correctionId(
  kind: ArborCorrectionKind,
  value: string,
): string {
  const family = correctionFamily(kind, value);

  return [
    kind,
    family ??
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80),
  ].join(":");
}

export function createCorrection(input: {
  value: string;
  source: "text" | "voice" | "annabelle";
  observedAt: string;
  kind?: ArborCorrectionKind;
  confidence?: number;
  protected?: boolean;
  /** Trusted host's stable user-message ID. Reuse on retries; never generate here. */
  observationId?: string;
}): ArborCorrection {
  if (input.observationId !== undefined &&
      !/^[A-Za-z0-9._:-]{4,200}$/.test(input.observationId))
    throw new Error("arbor_correction_invalid_observation_ids");
  const kind = input.kind ?? classifyCorrection(input.value);

  return {
    id: correctionId(kind, input.value),
    kind,
    value: input.value.trim(),
    source: input.source,
    observedAt: input.observedAt,
    confidence: input.confidence ?? 1,
    protected: input.protected ?? true,
    occurrences: 1,
    ...(input.observationId ? {
      observationIds: [input.observationId],
      legacyOccurrences: 0,
    } : {}),
  };
}

export function behaviorCorrections(corrections: ArborCorrection[]): string[] {
  return corrections
    .filter((item) => item.kind !== "acoustic")
    .map((item) => item.value);
}

export function acousticCorrections(corrections: ArborCorrection[]): string[] {
  return corrections
    .filter((item) => item.kind === "acoustic")
    .map((item) => item.value);
}

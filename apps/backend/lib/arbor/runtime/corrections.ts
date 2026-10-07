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
  /\bthat joke was weird\b/i,
  /\bdon'?t make everything a joke\b/i,
  /\bdo not make everything a joke\b/i,
  /\bthat was (?:actually )?funny\b/i,
  /\bmore like that\b/i,
  /\bmore humou?r\b/i,
  /\bless humou?r\b/i,
  /\bstop doing the gothic thing\b/i,
  /\bdon'?t tease\b/i,
  /\bdo not tease\b/i,
  /\btoo much profanity\b/i,
  /\btoo much swearing\b/i,
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
  /\bthat joke was weird\b/i,
  /\bdon'?t make everything a joke\b/i,
  /\bdo not make everything a joke\b/i,
  /\bthat was (?:actually )?funny\b/i,
  /\bmore like that\b/i,
  /\bmore humou?r\b/i,
  /\bless humou?r\b/i,
  /\bstop doing the gothic thing\b/i,
  /\bdon'?t tease\b/i,
  /\bdo not tease\b/i,
  /\btoo much profanity\b/i,
  /\btoo much swearing\b/i,
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

export function detectCorrectionKind(value: string): ArborCorrectionKind | null {
  if (BEHAVIOR_FEEDBACK_PATTERNS.some((pattern) => pattern.test(value))) {
    return "behavior";
  }

  if (
    ACOUSTIC_FEEDBACK_CONTEXT.test(value) &&
    ACOUSTIC_PATTERNS.some((pattern) => pattern.test(value))
  ) {
    return "acoustic";
  }

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
      /\b(?:that joke was weird|don'?t make everything a joke|do not make everything a joke|that was (?:actually )?funny|more like that|more humou?r|less humou?r|humou?r is gone|bring back the humou?r|stop doing the gothic thing|don'?t tease|do not tease|too much profanity|too much swearing)\b/i.test(text)
    ) {
      return "humor-pragmatics";
    }

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
}): ArborCorrection {
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

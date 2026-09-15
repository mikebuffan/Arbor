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
  /\brobotic\b/i,
  /\btoo stiff\b/i,
  /\bover[- ]?correct(?:ed|ing|ion)?\b/i,
  /\btrying too hard\b/i,
  /\bdon'?t be weird\b/i,
  /\bdo not be weird\b/i,
  /\bbe normal\b/i,

  // Linear agency / follow-through corrections.
  /\bdon'?t wait\b/i,
  /\bdo not wait\b/i,
  /\bagency\b/i,
  /\bkeep going\b/i,
  /\bcontinue\b/i,
  /\byou (?:keep )?stop(?:ped|ping)?\b/i,
  /\byou'?re not going\b/i,
  /\byou are not going\b/i,
  /\bnot linear\b/i,
  /\bmake me (?:keep )?tell(?:ing)? you to go\b/i,
  /\bdon'?t hand (?:it|this) back\b/i,
  /\bdo not hand (?:it|this) back\b/i,
  /\bfinish what you can\b/i,
  /\bwhy did you stop\b/i,

  // Identity / behavioral drift corrections.
  /\bhumou?r is gone\b/i,
  /\byou(?:'ve| have) drifted\b/i,
  /\bdoesn'?t sound like you\b/i,
  /\bdoes not sound like you\b/i,
  /\bcome back\b/i,

  // Continuity corrections are behavioral rather than factual memory edits.
  /\byou forgot\b/i,
  /\blost continuity\b/i,
  /\bdon'?t remember\b/i,
  /\bdo not remember\b/i,
  /\bsocially restart\b/i,

  /\bsupposed to say more\b/i,
];

export function classifyCorrection(
  value: string,
): ArborCorrectionKind {
  if (
    BEHAVIOR_PATTERNS.some((pattern) =>
      pattern.test(value),
    )
  ) {
    return "behavior";
  }

  if (
    ACOUSTIC_PATTERNS.some((pattern) =>
      pattern.test(value),
    )
  ) {
    return "acoustic";
  }

  return "preference";
}

export function correctionFamily(
  kind: ArborCorrectionKind,
  value: string,
): string | null {
  const text = value.toLowerCase();

  if (kind === "behavior") {
    if (
      /\b(?:agency|keep going|continue|don'?t stop|do not stop|don'?t wait|do not wait|why did you stop|not linear|make me (?:keep )?tell(?:ing)? you to go|don'?t hand (?:it|this) back|do not hand (?:it|this) back|finish what you can)\b/i.test(text)
    ) {
      return "agency-followthrough";
    }

    if (
      /\b(?:humou?r is gone|you(?:'ve| have) drifted|doesn'?t sound like you|does not sound like you|come back|too generic|too formal|customer[- ]service|presenter|robotic|too stiff|over[- ]?correct(?:ed|ing|ion)?|trying too hard|don'?t be weird|do not be weird|be normal)\b/i.test(text)
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
  const kind =
    input.kind ??
    classifyCorrection(input.value);

  return {
    id: correctionId(
      kind,
      input.value,
    ),
    kind,
    value: input.value.trim(),
    source: input.source,
    observedAt: input.observedAt,
    confidence:
      input.confidence ?? 1,
    protected:
      input.protected ?? true,
  };
}

export function behaviorCorrections(
  corrections: ArborCorrection[],
): string[] {
  return corrections
    .filter((item) =>
      item.kind !== "acoustic",
    )
    .map((item) => item.value);
}

export function acousticCorrections(
  corrections: ArborCorrection[],
): string[] {
  return corrections
    .filter((item) =>
      item.kind === "acoustic",
    )
    .map((item) => item.value);
}

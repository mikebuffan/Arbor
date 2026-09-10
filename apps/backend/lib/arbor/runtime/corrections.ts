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
  /\bdon'?t wait\b/i,
  /\bagency\b/i,
  /\bkeep going\b/i,
  /\bsupposed to say more\b/i,
];

export function classifyCorrection(
  value: string,
): ArborCorrectionKind {
  if (
    ACOUSTIC_PATTERNS.some((pattern) =>
      pattern.test(value),
    )
  ) {
    return "acoustic";
  }

  if (
    BEHAVIOR_PATTERNS.some((pattern) =>
      pattern.test(value),
    )
  ) {
    return "behavior";
  }

  return "preference";
}

export function correctionId(
  kind: ArborCorrectionKind,
  value: string,
): string {
  return [
    kind,
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

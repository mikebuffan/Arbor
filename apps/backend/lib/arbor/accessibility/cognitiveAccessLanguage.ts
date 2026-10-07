export type CognitiveAccessSource =
  | "typed"
  | "speech_to_text"
  | "unknown";

export type CognitiveAccessRisk =
  | "ordinary"
  | "sensitive"
  | "high_consequence";

export type DegradationSignal =
  | "transposed_letters"
  | "missing_letters"
  | "missing_words"
  | "punctuation_disruption"
  | "fragmented_thought"
  | "phonetic_spelling"
  | "speech_to_text_noise"
  | "word_finding_gap"
  | "abrupt_topic_shift"
  | "motor_input_error"
  | "fatigue_or_noisy_input"
  | "multi_error"
  | "unknown";

export type InterpretationCandidate = {
  text: string;
  confidence: number;
  rationale: string[];
  /**
   * Optional equivalence key supplied by a contextual interpreter when two
   * differently worded candidates would produce the same answer/action.
   * This avoids needless clarification without pretending the scorer knows
   * more than it does.
   */
  meaningKey?: string;
};

export type CognitiveAccessInput = {
  rawText: string;
  source: CognitiveAccessSource;
  risk: CognitiveAccessRisk;
  degradationSignals: DegradationSignal[];
  candidates: InterpretationCandidate[];
  /**
   * Explicit literals that must survive exactly. Use this for names, project
   * names, identifiers, or other caller-known source tokens.
   */
  protectedTokens?: string[];
};

export type CognitiveAccessConfidence = "none" | "low" | "moderate" | "high";

export type CognitiveAccessDecision = {
  action:
    | "use_raw"
    | "use_best_interpretation"
    | "clarify";
  interpretedText: string | null;
  rawTextPreserved: string;
  alternatives: string[];
  /**
   * The candidate score remains available for deterministic tests/selection.
   * It is a ranking signal, not a calibrated probability.
   */
  confidence: number | null;
  confidenceBand: CognitiveAccessConfidence;
  reasons: string[];
  protectedLiterals: string[];
  source: CognitiveAccessSource;
  degradationSignals: DegradationSignal[];
  clarificationRequired: boolean;
  mayAuthenticateIdentity: false;
};

export type CognitiveAccessInterpretationReceipt = {
  schemaVersion: 1;
  rawText: string;
  workingInterpretation: string | null;
  decision: CognitiveAccessDecision["action"];
  confidence: CognitiveAccessConfidence;
  alternatives: string[];
  clarificationRequired: boolean;
  clarificationReasons: string[];
  protectedLiterals: string[];
  source: CognitiveAccessSource;
  degradationSignals: DegradationSignal[];
  mayAuthenticateIdentity: false;
};

const MIN_SUPPORTED_SCORE = 0.72;
const AMBIGUITY_MARGIN = 0.12;

const NEGATION_PATTERN =
  /\b(?:no|not|never|without|dont|don't|doesnt|doesn't|didnt|didn't|cannot|can't|cant|wont|won't)\b/gi;

const CONTROL_STOP_PATTERN =
  /^(?:no|wait|stop|hold on|dont|don't|do not|cancel|never mind|nevermind)[.!?,\s]*$/i;

function cleanCandidate(
  candidate: InterpretationCandidate,
): InterpretationCandidate | null {
  const text = candidate.text.trim();
  if (!text) return null;
  const confidence = Number(candidate.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return null;
  }
  const meaningKey = candidate.meaningKey?.trim() || undefined;
  return {
    text,
    confidence,
    rationale: Array.from(
      new Set(candidate.rationale.map((x) => x.trim()).filter(Boolean)),
    ),
    ...(meaningKey ? { meaningKey } : {}),
  };
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractAutomaticProtectedLiterals(raw: string): string[] {
  const matches: string[] = [];
  const patterns = [
    /[$€£]\s?\d[\d,]*(?:\.\d+)?/g,
    /\b\d{1,4}[/-]\d{1,2}(?:[/-]\d{1,4})?\b/g,
    /#\d+\b/g,
    /\b[A-Z]{1,8}[-_]?[A-Z0-9]*\d[A-Z0-9_-]*\b/g,
    /\b[a-f0-9]{7,64}\b/gi,
    /\b\d+(?:\.\d+)?\b/g,
  ];

  for (const pattern of patterns) {
    matches.push(...(raw.match(pattern) ?? []));
  }

  return unique(matches);
}

function collectProtectedLiterals(
  raw: string,
  explicit: readonly string[] | undefined,
): string[] {
  const callerProtected = (explicit ?? [])
    .map((value) => value.trim())
    .filter((value) => value && raw.toLocaleLowerCase().includes(value.toLocaleLowerCase()));

  return unique([
    ...callerProtected,
    ...extractAutomaticProtectedLiterals(raw),
  ]);
}

function changesProtectedLiteral(
  candidate: string,
  protectedLiterals: readonly string[],
): boolean {
  return protectedLiterals.some((literal) => !candidate.includes(literal));
}

function negationSignature(text: string): string[] {
  return unique(
    (text.match(NEGATION_PATTERN) ?? [])
      .map((token) => token.toLocaleLowerCase().replace(/[’']/g, "")),
  ).sort();
}

function changesNegation(raw: string, candidate: string): boolean {
  return negationSignature(raw).join("|") !== negationSignature(candidate).join("|");
}

function rewritesStopControl(raw: string, candidate: string): boolean {
  if (!CONTROL_STOP_PATTERN.test(raw.trim())) return false;
  return raw.trim().toLocaleLowerCase() !== candidate.trim().toLocaleLowerCase();
}

function confidenceBand(score: number | null): CognitiveAccessConfidence {
  if (score == null) return "none";
  if (score < MIN_SUPPORTED_SCORE) return "low";
  if (score < 0.85) return "moderate";
  return "high";
}

function sameMeaning(
  first: InterpretationCandidate,
  second: InterpretationCandidate,
): boolean {
  return Boolean(
    first.meaningKey &&
      second.meaningKey &&
      first.meaningKey === second.meaningKey,
  );
}

function decisionBase(
  input: CognitiveAccessInput,
  raw: string,
  protectedLiterals: string[],
) {
  return {
    rawTextPreserved: raw,
    protectedLiterals,
    source: input.source,
    degradationSignals: unique(input.degradationSignals),
    mayAuthenticateIdentity: false as const,
  };
}

export function decideCognitiveAccessRecovery(
  input: CognitiveAccessInput,
): CognitiveAccessDecision {
  const raw = input.rawText ?? "";
  const rawTrimmed = raw.trim();
  const protectedLiterals = collectProtectedLiterals(
    raw,
    input.protectedTokens,
  );
  const base = decisionBase(input, raw, protectedLiterals);

  const cleanedCandidates = input.candidates
    .map(cleanCandidate)
    .filter((x): x is InterpretationCandidate => x !== null)
    .sort((a, b) => b.confidence - a.confidence);

  const protectedRejected = cleanedCandidates.filter((candidate) =>
    changesProtectedLiteral(candidate.text, protectedLiterals),
  );
  const candidates = cleanedCandidates.filter(
    (candidate) => !changesProtectedLiteral(candidate.text, protectedLiterals),
  );

  if (!rawTrimmed) {
    return {
      ...base,
      action: "clarify",
      interpretedText: null,
      alternatives: [],
      confidence: null,
      confidenceBand: "none",
      reasons: ["empty_or_unusable_input"],
      clarificationRequired: true,
    };
  }

  if (candidates.length === 0) {
    return {
      ...base,
      action: "use_raw",
      interpretedText: rawTrimmed,
      alternatives: [],
      confidence: null,
      confidenceBand: "none",
      reasons: protectedRejected.length
        ? ["candidate_changed_protected_literal"]
        : ["no_supported_alternate_interpretation"],
      clarificationRequired: false,
    };
  }

  const [best, second] = candidates;
  const margin = second ? best.confidence - second.confidence : best.confidence;

  if (changesNegation(rawTrimmed, best.text)) {
    return {
      ...base,
      action: "clarify",
      interpretedText: null,
      alternatives: candidates.slice(0, 3).map((x) => x.text),
      confidence: best.confidence,
      confidenceBand: confidenceBand(best.confidence),
      reasons: ["interpretation_changes_negation"],
      clarificationRequired: true,
    };
  }

  if (rewritesStopControl(rawTrimmed, best.text)) {
    return {
      ...base,
      action: "clarify",
      interpretedText: null,
      alternatives: candidates.slice(0, 3).map((x) => x.text),
      confidence: best.confidence,
      confidenceBand: confidenceBand(best.confidence),
      reasons: ["stop_or_pause_control_cannot_be_silently_rewritten"],
      clarificationRequired: true,
    };
  }

  if (input.risk === "high_consequence" && best.text !== rawTrimmed) {
    return {
      ...base,
      action: "clarify",
      interpretedText: null,
      alternatives: candidates.slice(0, 3).map((x) => x.text),
      confidence: best.confidence,
      confidenceBand: confidenceBand(best.confidence),
      reasons: ["high_consequence_requires_confirmation_for_reconstruction"],
      clarificationRequired: true,
    };
  }

  if (best.confidence < MIN_SUPPORTED_SCORE) {
    return {
      ...base,
      action: "clarify",
      interpretedText: null,
      alternatives: candidates.slice(0, 3).map((x) => x.text),
      confidence: best.confidence,
      confidenceBand: confidenceBand(best.confidence),
      reasons: ["best_interpretation_confidence_too_low"],
      clarificationRequired: true,
    };
  }

  if (second && margin < AMBIGUITY_MARGIN && !sameMeaning(best, second)) {
    return {
      ...base,
      action: "clarify",
      interpretedText: null,
      alternatives: candidates.slice(0, 3).map((x) => x.text),
      confidence: best.confidence,
      confidenceBand: confidenceBand(best.confidence),
      reasons: ["multiple_materially_plausible_interpretations"],
      clarificationRequired: true,
    };
  }

  if (best.text === rawTrimmed) {
    return {
      ...base,
      action: "use_raw",
      interpretedText: rawTrimmed,
      alternatives: candidates.slice(1, 3).map((x) => x.text),
      confidence: best.confidence,
      confidenceBand: confidenceBand(best.confidence),
      reasons: ["raw_input_remains_best_interpretation"],
      clarificationRequired: false,
    };
  }

  return {
    ...base,
    action: "use_best_interpretation",
    interpretedText: best.text,
    alternatives: candidates.slice(1, 3).map((x) => x.text),
    confidence: best.confidence,
    confidenceBand: confidenceBand(best.confidence),
    reasons: ["high_confidence_contextual_recovery"],
    clarificationRequired: false,
  };
}

export function buildCognitiveAccessInterpretationReceipt(
  decision: CognitiveAccessDecision,
): CognitiveAccessInterpretationReceipt {
  return {
    schemaVersion: 1,
    rawText: decision.rawTextPreserved,
    workingInterpretation: decision.interpretedText,
    decision: decision.action,
    confidence: decision.confidenceBand,
    alternatives: [...decision.alternatives],
    clarificationRequired: decision.clarificationRequired,
    clarificationReasons: decision.clarificationRequired
      ? [...decision.reasons]
      : [],
    protectedLiterals: [...decision.protectedLiterals],
    source: decision.source,
    degradationSignals: [...decision.degradationSignals],
    mayAuthenticateIdentity: false,
  };
}

export function buildCognitiveAccessPromptBlock(
  decision: CognitiveAccessDecision,
): string {
  const lines = [
    "COGNITIVE-ACCESS LANGUAGE CONTRACT",
    "- Preserve the user's raw wording as source evidence.",
    "- Treat any reconstructed wording as an interpretation, never as a replacement record.",
    "- Do not infer lower intelligence from atypical spelling, punctuation, fragmentation, or speech-to-text noise.",
    "- Ask for clarification only when ambiguity materially changes the answer or action.",
    "- Protected literals, negation, and explicit stop/pause controls must not be silently rewritten.",
    "- Never use this accessibility interpretation as identity authentication.",
  ];

  if (decision.action === "use_best_interpretation" && decision.interpretedText) {
    lines.push(
      "- Working interpretation: " + decision.interpretedText,
      "- Confidence band: " + decision.confidenceBand,
      "- Raw source remains authoritative and separately preserved.",
    );
  }

  if (decision.action === "clarify" && decision.alternatives.length > 0) {
    lines.push(
      "- Ambiguity remains and materially affects the answer/action. Plausible interpretations:",
      ...decision.alternatives.map((x) => "  - " + x),
    );
  }

  return lines.join("\n");
}

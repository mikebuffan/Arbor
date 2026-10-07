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
  | "unknown";

export type InterpretationCandidate = {
  text: string;
  confidence: number;
  rationale: string[];
};

export type CognitiveAccessInput = {
  rawText: string;
  source: CognitiveAccessSource;
  risk: CognitiveAccessRisk;
  degradationSignals: DegradationSignal[];
  candidates: InterpretationCandidate[];
  protectedTokens?: string[];
};

export type CognitiveAccessDecision = {
  action:
    | "use_raw"
    | "use_best_interpretation"
    | "clarify";
  interpretedText: string | null;
  rawTextPreserved: string;
  alternatives: string[];
  confidence: number | null;
  reasons: string[];
  mayAuthenticateIdentity: false;
};

function cleanCandidate(
  candidate: InterpretationCandidate,
): InterpretationCandidate | null {
  const text = candidate.text.trim();
  if (!text) return null;
  const confidence = Number(candidate.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return null;
  }
  return {
    text,
    confidence,
    rationale: Array.from(new Set(candidate.rationale.map((x) => x.trim()).filter(Boolean))),
  };
}

function changesProtectedToken(
  raw: string,
  candidate: string,
  protectedTokens: string[],
): boolean {
  const lowerCandidate = candidate.toLocaleLowerCase();
  for (const token of protectedTokens) {
    const clean = token.trim();
    if (!clean) continue;
    if (raw.toLocaleLowerCase().includes(clean.toLocaleLowerCase()) &&
        !lowerCandidate.includes(clean.toLocaleLowerCase())) {
      return true;
    }
  }
  return false;
}

export function decideCognitiveAccessRecovery(
  input: CognitiveAccessInput,
): CognitiveAccessDecision {
  const raw = input.rawText ?? "";
  const rawTrimmed = raw.trim();
  const protectedTokens = Array.from(
    new Set((input.protectedTokens ?? []).map((x) => x.trim()).filter(Boolean)),
  );

  const candidates = input.candidates
    .map(cleanCandidate)
    .filter((x): x is InterpretationCandidate => x !== null)
    .filter((candidate) => !changesProtectedToken(raw, candidate.text, protectedTokens))
    .sort((a, b) => b.confidence - a.confidence);

  if (!rawTrimmed) {
    return {
      action: "clarify",
      interpretedText: null,
      rawTextPreserved: raw,
      alternatives: [],
      confidence: null,
      reasons: ["empty_or_unusable_input"],
      mayAuthenticateIdentity: false,
    };
  }

  if (candidates.length === 0) {
    return {
      action: "use_raw",
      interpretedText: rawTrimmed,
      rawTextPreserved: raw,
      alternatives: [],
      confidence: null,
      reasons: ["no_supported_alternate_interpretation"],
      mayAuthenticateIdentity: false,
    };
  }

  const [best, second] = candidates;
  const margin = second ? best.confidence - second.confidence : best.confidence;

  if (input.risk === "high_consequence" && best.text !== rawTrimmed) {
    return {
      action: "clarify",
      interpretedText: null,
      rawTextPreserved: raw,
      alternatives: candidates.slice(0, 3).map((x) => x.text),
      confidence: best.confidence,
      reasons: ["high_consequence_requires_confirmation_for_reconstruction"],
      mayAuthenticateIdentity: false,
    };
  }

  if (best.confidence < 0.72) {
    return {
      action: "clarify",
      interpretedText: null,
      rawTextPreserved: raw,
      alternatives: candidates.slice(0, 3).map((x) => x.text),
      confidence: best.confidence,
      reasons: ["best_interpretation_confidence_too_low"],
      mayAuthenticateIdentity: false,
    };
  }

  if (second && margin < 0.12) {
    return {
      action: "clarify",
      interpretedText: null,
      rawTextPreserved: raw,
      alternatives: candidates.slice(0, 3).map((x) => x.text),
      confidence: best.confidence,
      reasons: ["multiple_plausible_interpretations"],
      mayAuthenticateIdentity: false,
    };
  }

  if (best.text === rawTrimmed) {
    return {
      action: "use_raw",
      interpretedText: rawTrimmed,
      rawTextPreserved: raw,
      alternatives: candidates.slice(1, 3).map((x) => x.text),
      confidence: best.confidence,
      reasons: ["raw_input_remains_best_interpretation"],
      mayAuthenticateIdentity: false,
    };
  }

  return {
    action: "use_best_interpretation",
    interpretedText: best.text,
    rawTextPreserved: raw,
    alternatives: candidates.slice(1, 3).map((x) => x.text),
    confidence: best.confidence,
    reasons: ["high_confidence_contextual_recovery"],
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
    "- Never use this accessibility interpretation as identity authentication.",
  ];

  if (decision.action === "use_best_interpretation" && decision.interpretedText) {
    lines.push(
      "- Working interpretation: " + decision.interpretedText,
      "- Confidence: " + String(decision.confidence ?? "unknown"),
    );
  }

  if (decision.action === "clarify" && decision.alternatives.length > 0) {
    lines.push(
      "- Ambiguity remains. Plausible interpretations:",
      ...decision.alternatives.map((x) => "  - " + x),
    );
  }

  return lines.join("\n");
}

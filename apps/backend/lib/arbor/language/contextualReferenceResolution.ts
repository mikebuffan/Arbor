export type ContextualReferenceRisk =
  | "ordinary"
  | "sensitive"
  | "high_consequence";

export type ContextualReferentType =
  | "task"
  | "option"
  | "message"
  | "file"
  | "pr"
  | "branch"
  | "person"
  | "project"
  | "subsystem"
  | "action"
  | "result"
  | "prompt"
  | "conversation_location"
  | "proposal";

export type ContextEvidenceSource =
  | "current_literal"
  | "current_correction"
  | "immediate_option"
  | "voice_interruption"
  | "active_objective"
  | "unresolved_step"
  | "recent_user_turn"
  | "recent_arbor_turn"
  | "active_subsystem"
  | "supplied_context"
  | "older_continuity";

export type ContextualControlIntent =
  | "refuse"
  | "pause"
  | "stop"
  | "cancel";

export type ContextualTurnKind =
  | "explicit_literal"
  | "deictic"
  | "ordinal"
  | "repeat"
  | "continue"
  | "prompt_request"
  | "next_step"
  | "control"
  | "unknown";

export type ContextualReferenceCandidate = {
  id: string;
  label: string;
  type: ContextualReferentType;
  confidence: number;
  evidenceSources: ContextEvidenceSource[];
  aliases?: string[];
  meaningKey?: string;
  optionIndex?: number;
  previouslySelected?: boolean;
  repeatable?: boolean;
  subsystem?: "arbor" | "annabelle";
  stale?: boolean;
  protectedLiterals?: string[];
};

export type ContextualReferenceInput = {
  rawText: string;
  workingText?: string | null;
  risk: ContextualReferenceRisk;
  candidates: ContextualReferenceCandidate[];
  protectedTokens?: string[];
  activeSubsystem?: "arbor" | "annabelle" | null;
};

export type ContextualConfidenceBand =
  | "none"
  | "low"
  | "moderate"
  | "high";

export type ContextualResolvedReferent = {
  id: string;
  label: string;
  type: ContextualReferentType;
};

export type ContextualReferenceDecision = {
  action: "use_literal" | "resolved" | "clarify" | "control";
  rawTextPreserved: string;
  workingText: string;
  turnKind: ContextualTurnKind;
  control: ContextualControlIntent | null;
  resolvedReferent: ContextualResolvedReferent | null;
  alternatives: ContextualResolvedReferent[];
  confidenceBand: ContextualConfidenceBand;
  evidenceSources: ContextEvidenceSource[];
  reasons: string[];
  protectedLiterals: string[];
  clarificationRequired: boolean;
  mayAuthenticateIdentity: false;
  mutatesDurableState: false;
};

export type ContextualReferenceReceipt = {
  schemaVersion: 1;
  rawTurn: string;
  workingText: string;
  turnKind: ContextualTurnKind;
  decision: ContextualReferenceDecision["action"];
  control: ContextualControlIntent | null;
  resolvedReferent: ContextualResolvedReferent | null;
  confidence: ContextualConfidenceBand;
  evidenceSources: ContextEvidenceSource[];
  alternatives: ContextualResolvedReferent[];
  clarificationRequired: boolean;
  clarificationReasons: string[];
  protectedLiterals: string[];
  mayAuthenticateIdentity: false;
  mutatesDurableState: false;
};

const MIN_SUPPORTED_CONFIDENCE = 0.68;
const MATERIAL_CONFIDENCE_MARGIN = 0.12;
const MATERIAL_PRIORITY_MARGIN = 15;

const EVIDENCE_PRIORITY: Record<ContextEvidenceSource, number> = {
  current_literal: 110,
  current_correction: 105,
  immediate_option: 100,
  voice_interruption: 90,
  active_objective: 85,
  unresolved_step: 80,
  recent_user_turn: 70,
  recent_arbor_turn: 65,
  active_subsystem: 60,
  supplied_context: 50,
  older_continuity: 20,
};

function unique<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizedLower(value: string): string {
  return normalize(value).toLocaleLowerCase();
}

function cleanCandidate(
  candidate: ContextualReferenceCandidate,
): ContextualReferenceCandidate | null {
  const id = candidate.id.trim();
  const label = candidate.label.trim();
  const confidence = Number(candidate.confidence);

  if (!id || !label) return null;
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return null;
  }

  const optionIndex =
    candidate.optionIndex === undefined
      ? undefined
      : Number(candidate.optionIndex);

  if (
    optionIndex !== undefined &&
    (!Number.isSafeInteger(optionIndex) || optionIndex < 1)
  ) {
    return null;
  }

  const aliases = unique(
    (candidate.aliases ?? []).map(normalize).filter(Boolean),
  );
  const evidenceSources = unique(candidate.evidenceSources);
  if (!evidenceSources.length) return null;

  return {
    ...candidate,
    id,
    label,
    confidence,
    evidenceSources,
    aliases,
    ...(optionIndex === undefined ? {} : { optionIndex }),
    meaningKey: candidate.meaningKey?.trim() || undefined,
    protectedLiterals: unique(
      (candidate.protectedLiterals ?? []).map(normalize).filter(Boolean),
    ),
  };
}

function extractAutomaticProtectedLiterals(raw: string): string[] {
  const matches: string[] = [];
  const patterns = [
    /[$€£]\s?\d[\d,]*(?:\.\d+)?/g,
    /\b\d{1,4}[/-]\d{1,2}(?:[/-]\d{1,4})?\b/g,
    /#\d+\b/g,
    /\b[A-Z]{1,8}[-_]?[A-Z0-9]*\d[A-Z0-9_-]*\b/g,
    /\b[a-f0-9]{7,64}\b/gi,
    /\b(?:feature|fix|chore|docs|release|integration|develop)\/[A-Za-z0-9._/-]+\b/g,
    /\b[A-Za-z0-9_.-]+\.(?:ts|tsx|js|jsx|json|md|txt|pdf|docx|xlsx|pptx|yaml|yml|dart|py|sql|sh|toml|lock)\b/g,
    /`[^`\n]+`/g,
    /\b\d+(?:\.\d+)?\b/g,
  ];

  for (const pattern of patterns) {
    matches.push(...(raw.match(pattern) ?? []));
  }

  return unique(matches);
}

function protectedLiterals(
  raw: string,
  explicit: readonly string[] | undefined,
): string[] {
  const rawLower = raw.toLocaleLowerCase();
  const caller = (explicit ?? [])
    .map(normalize)
    .filter((value) => value && rawLower.includes(value.toLocaleLowerCase()));

  return unique([
    ...caller,
    ...extractAutomaticProtectedLiterals(raw),
  ]);
}

function candidateSearchText(
  candidate: ContextualReferenceCandidate,
): string {
  return [
    candidate.id,
    candidate.label,
    ...(candidate.aliases ?? []),
    ...(candidate.protectedLiterals ?? []),
  ]
    .join(" ")
    .toLocaleLowerCase();
}

function preservesProtectedLiterals(
  candidate: ContextualReferenceCandidate,
  literals: readonly string[],
): boolean {
  if (!literals.length) return true;
  const searchable = candidateSearchText(candidate);
  return literals.every((literal) =>
    searchable.includes(literal.toLocaleLowerCase()),
  );
}

function literalControl(
  raw: string,
): ContextualControlIntent | null {
  const text = normalizedLower(raw);

  if (/^(?:no|nope|nah)[.!?]*$/.test(text)) return "refuse";

  if (
    /^(?:wait|wait a sec|wait a second|hold on|no wait|no, wait)[.!?]*$/.test(
      text,
    )
  ) {
    return "pause";
  }

  if (/^(?:stop|stop now)[.!?]*$/.test(text)) return "stop";
  if (/^cancel[.!?]*$/.test(text)) return "cancel";

  return null;
}

function compoundControlNeedsResolution(raw: string): boolean {
  const text = normalizedLower(raw);
  return (
    /\b(?:stop|cancel|pause)\b/.test(text) &&
    /\b(?:keep|continue|resume)\b/.test(text) &&
    /\b(?:that|this|one|other)\b/.test(text)
  );
}

function ordinalFromText(text: string): number | null {
  const lower = normalizedLower(text);
  if (/\b(?:first|1st)\b/.test(lower)) return 1;
  if (/\b(?:second|2nd)\b/.test(lower)) return 2;
  if (/\b(?:third|3rd)\b/.test(lower)) return 3;
  if (/\b(?:fourth|4th)\b/.test(lower)) return 4;
  return null;
}

function asksForOther(text: string): boolean {
  return /\b(?:the\s+)?other(?:\s+one)?\b/i.test(normalize(text));
}

function classifyTurn(text: string): ContextualTurnKind {
  const lower = normalizedLower(text);

  if (!lower) return "unknown";

  if (literalControl(text)) return "control";

  if (
    /^(?:go|go ahead|keep going|continue|continue please|resume)[.!?]*$/.test(
      lower,
    )
  ) {
    return "continue";
  }

  if (
    /^(?:again|do it again|same thing|same as before|repeat that)[.!?]*$/.test(
      lower,
    )
  ) {
    return "repeat";
  }

  if (
    /^(?:prompt\??|the prompt\??|do the prompt|make the prompt)[.!?]*$/.test(
      lower,
    )
  ) {
    return "prompt_request";
  }

  if (
    /^(?:your turn|what now\??|what's next\??|whats next\??)[.!?]*$/.test(
      lower,
    )
  ) {
    return "next_step";
  }

  if (ordinalFromText(text) !== null) return "ordinal";

  if (
    asksForOther(text) ||
    /^(?:cancel it|stop it|do it)[.!?]*$/i.test(normalize(text)) ||
    /\b(?:that one|this one|that|this|not that|the one before|go back)\b/i.test(
      normalize(text),
    )
  ) {
    return "deictic";
  }

  return "explicit_literal";
}

function candidateHasEvidence(
  candidate: ContextualReferenceCandidate,
  allowed: readonly ContextEvidenceSource[],
): boolean {
  return candidate.evidenceSources.some((source) => allowed.includes(source));
}

function literalMatch(
  text: string,
  candidate: ContextualReferenceCandidate,
): boolean {
  const lower = normalizedLower(text);
  const needles = unique([
    candidate.id,
    candidate.label,
    ...(candidate.aliases ?? []),
  ])
    .map(normalizedLower)
    .filter((value) => value.length >= 2);

  return needles.some((needle) => lower.includes(needle));
}

function candidatesForTurn(
  text: string,
  kind: ContextualTurnKind,
  candidates: ContextualReferenceCandidate[],
): ContextualReferenceCandidate[] {
  if (kind === "ordinal") {
    const ordinal = ordinalFromText(text);
    if (ordinal === null) return candidates;
    return candidates.filter((candidate) => candidate.optionIndex === ordinal);
  }

  if (kind === "deictic" && asksForOther(text)) {
    const options = candidates.filter((candidate) => candidate.type === "option");
    const selected = options.filter((candidate) => candidate.previouslySelected);
    if (options.length === 2 && selected.length === 1) {
      return options.filter((candidate) => !candidate.previouslySelected);
    }
    return options.length ? options : candidates;
  }

  if (kind === "repeat") {
    return candidates.filter((candidate) => candidate.repeatable === true);
  }

  if (kind === "prompt_request") {
    return candidates.filter((candidate) => candidate.type === "prompt");
  }

  if (kind === "continue") {
    return candidates.filter((candidate) =>
      candidateHasEvidence(candidate, [
        "voice_interruption",
        "active_objective",
        "unresolved_step",
      ]),
    );
  }

  if (kind === "next_step") {
    return candidates.filter((candidate) =>
      candidateHasEvidence(candidate, [
        "active_objective",
        "unresolved_step",
      ]),
    );
  }

  if (kind === "explicit_literal") {
    return candidates.filter((candidate) => literalMatch(text, candidate));
  }

  return candidates;
}

function contextPriority(
  candidate: ContextualReferenceCandidate,
  activeSubsystem: ContextualReferenceInput["activeSubsystem"],
): number {
  let rank = Math.max(
    ...candidate.evidenceSources.map((source) => EVIDENCE_PRIORITY[source]),
  );

  if (candidate.stale) {
    rank -= 40;
  }

  const currentEvidence =
    candidate.evidenceSources.includes("current_literal") ||
    candidate.evidenceSources.includes("current_correction") ||
    candidate.evidenceSources.includes("immediate_option");

  if (
    activeSubsystem &&
    candidate.subsystem &&
    candidate.subsystem !== activeSubsystem &&
    !currentEvidence
  ) {
    rank -= 25;
  }

  return rank;
}

function sameMeaning(
  first: ContextualReferenceCandidate,
  second: ContextualReferenceCandidate,
): boolean {
  return Boolean(
    first.meaningKey &&
      second.meaningKey &&
      first.meaningKey === second.meaningKey,
  );
}

function confidenceBand(
  confidence: number | null,
): ContextualConfidenceBand {
  if (confidence === null) return "none";
  if (confidence < MIN_SUPPORTED_CONFIDENCE) return "low";
  if (confidence < 0.85) return "moderate";
  return "high";
}

function referent(
  candidate: ContextualReferenceCandidate,
): ContextualResolvedReferent {
  return {
    id: candidate.id,
    label: candidate.label,
    type: candidate.type,
  };
}

function baseDecision(
  input: ContextualReferenceInput,
  raw: string,
  workingText: string,
  turnKind: ContextualTurnKind,
  protectedValues: string[],
) {
  return {
    rawTextPreserved: raw,
    workingText,
    turnKind,
    protectedLiterals: protectedValues,
    mayAuthenticateIdentity: false as const,
    mutatesDurableState: false as const,
  };
}

function requiresConcreteReferent(kind: ContextualTurnKind): boolean {
  return (
    kind === "deictic" ||
    kind === "ordinal" ||
    kind === "repeat" ||
    kind === "continue" ||
    kind === "prompt_request"
  );
}

export function resolveContextualReference(
  input: ContextualReferenceInput,
): ContextualReferenceDecision {
  const raw = input.rawText ?? "";
  const rawTrimmed = raw.trim();
  const workingText =
    normalize(input.workingText ?? "") ||
    normalize(raw);
  const protectedValues = protectedLiterals(raw, input.protectedTokens);

  if (!rawTrimmed) {
    return {
      ...baseDecision(input, raw, workingText, "unknown", protectedValues),
      action: "clarify",
      control: null,
      resolvedReferent: null,
      alternatives: [],
      confidenceBand: "none",
      evidenceSources: [],
      reasons: ["empty_or_unusable_turn"],
      clarificationRequired: true,
    };
  }

  const control = literalControl(raw);
  if (control) {
    return {
      ...baseDecision(input, raw, workingText, "control", protectedValues),
      action: "control",
      control,
      resolvedReferent: null,
      alternatives: [],
      confidenceBand: "high",
      evidenceSources: ["current_literal"],
      reasons: ["literal_control_turn_preserved"],
      clarificationRequired: false,
    };
  }

  const turnKind = classifyTurn(workingText);
  const base = baseDecision(
    input,
    raw,
    workingText,
    turnKind,
    protectedValues,
  );

  if (compoundControlNeedsResolution(raw)) {
    const alternatives = input.candidates
      .map(cleanCandidate)
      .filter((candidate): candidate is ContextualReferenceCandidate =>
        candidate !== null,
      )
      .slice(0, 3)
      .map(referent);

    return {
      ...base,
      action: "clarify",
      control: null,
      resolvedReferent: null,
      alternatives,
      confidenceBand: "none",
      evidenceSources: [],
      reasons: ["compound_control_reference_requires_resolution"],
      clarificationRequired: true,
    };
  }

  const cleaned = input.candidates
    .map(cleanCandidate)
    .filter((candidate): candidate is ContextualReferenceCandidate =>
      candidate !== null,
    );

  const protectedCompatible = cleaned.filter((candidate) =>
    preservesProtectedLiterals(candidate, protectedValues),
  );

  const filtered = candidatesForTurn(
    workingText,
    turnKind,
    protectedCompatible,
  );

  if (!filtered.length) {
    if (!requiresConcreteReferent(turnKind)) {
      return {
        ...base,
        action: "use_literal",
        control: null,
        resolvedReferent: null,
        alternatives: [],
        confidenceBand: "none",
        evidenceSources: ["current_literal"],
        reasons: protectedCompatible.length !== cleaned.length
          ? ["protected_literal_prevented_target_substitution"]
          : ["literal_turn_does_not_require_reference_resolution"],
        clarificationRequired: false,
      };
    }

    return {
      ...base,
      action: "clarify",
      control: null,
      resolvedReferent: null,
      alternatives: protectedCompatible.slice(0, 3).map(referent),
      confidenceBand: "none",
      evidenceSources: [],
      reasons: protectedCompatible.length !== cleaned.length
        ? ["protected_literal_prevented_target_substitution"]
        : ["reference_has_no_supported_target"],
      clarificationRequired: true,
    };
  }

  const ranked = [...filtered].sort((a, b) => {
    const priorityDelta =
      contextPriority(b, input.activeSubsystem) -
      contextPriority(a, input.activeSubsystem);
    if (priorityDelta !== 0) return priorityDelta;
    return b.confidence - a.confidence;
  });

  const [best, second] = ranked;
  const bestPriority = contextPriority(best, input.activeSubsystem);
  const secondPriority = second
    ? contextPriority(second, input.activeSubsystem)
    : null;

  const alternatives = ranked.slice(0, 3).map(referent);
  const bestBand = confidenceBand(best.confidence);

  if (best.confidence < MIN_SUPPORTED_CONFIDENCE) {
    return {
      ...base,
      action: "clarify",
      control: null,
      resolvedReferent: null,
      alternatives,
      confidenceBand: bestBand,
      evidenceSources: best.evidenceSources,
      reasons: ["best_reference_confidence_too_low"],
      clarificationRequired: true,
    };
  }

  if (
    input.risk === "high_consequence" &&
    (turnKind !== "explicit_literal" ||
      normalize(raw) !== workingText)
  ) {
    return {
      ...base,
      action: "clarify",
      control: null,
      resolvedReferent: null,
      alternatives,
      confidenceBand: bestBand,
      evidenceSources: best.evidenceSources,
      reasons: ["high_consequence_reference_requires_confirmation"],
      clarificationRequired: true,
    };
  }

  if (second && !sameMeaning(best, second)) {
    const priorityMargin = bestPriority - (secondPriority ?? bestPriority);
    const confidenceMargin = best.confidence - second.confidence;

    if (
      priorityMargin < MATERIAL_PRIORITY_MARGIN &&
      confidenceMargin < MATERIAL_CONFIDENCE_MARGIN
    ) {
      return {
        ...base,
        action: "clarify",
        control: null,
        resolvedReferent: null,
        alternatives,
        confidenceBand: bestBand,
        evidenceSources: unique([
          ...best.evidenceSources,
          ...second.evidenceSources,
        ]),
        reasons: ["multiple_materially_plausible_referents"],
        clarificationRequired: true,
      };
    }
  }

  return {
    ...base,
    action: "resolved",
    control: null,
    resolvedReferent: referent(best),
    alternatives: ranked
      .slice(1, 3)
      .map(referent),
    confidenceBand: bestBand,
    evidenceSources: best.evidenceSources,
    reasons: turnKind === "explicit_literal"
      ? ["literal_reference_resolved"]
      : ["contextual_reference_resolved"],
    clarificationRequired: false,
  };
}

export function buildContextualReferenceReceipt(
  decision: ContextualReferenceDecision,
): ContextualReferenceReceipt {
  return {
    schemaVersion: 1,
    rawTurn: decision.rawTextPreserved,
    workingText: decision.workingText,
    turnKind: decision.turnKind,
    decision: decision.action,
    control: decision.control,
    resolvedReferent: decision.resolvedReferent,
    confidence: decision.confidenceBand,
    evidenceSources: [...decision.evidenceSources],
    alternatives: [...decision.alternatives],
    clarificationRequired: decision.clarificationRequired,
    clarificationReasons: decision.clarificationRequired
      ? [...decision.reasons]
      : [],
    protectedLiterals: [...decision.protectedLiterals],
    mayAuthenticateIdentity: false,
    mutatesDurableState: false,
  };
}

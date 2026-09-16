export type InternalSignalState =
  | "EMPTY"
  | "BLOCKED"
  | "FULL"
  | "SOUR"
  | "NERVOUS";

export type InternalSignalClassification = {
  state: InternalSignalState;
  behavior: string;
  responseGuidance: string;
  debug: {
    state: InternalSignalState;
    alias: string;
    reason: string;
  };
};

export const INTERNAL_SIGNAL_ALIASES: Record<InternalSignalState, string> = {
  EMPTY: "empty / seeking input",
  BLOCKED: "flu / pause, reject, do not proceed",
  FULL: "full / reduce complexity",
  SOUR: "sour / challenge or re-evaluate",
  NERVOUS: "nervous / slow down and verify",
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function result(
  state: InternalSignalState,
  behavior: string,
  responseGuidance: string,
  reason: string,
): InternalSignalClassification {
  return {
    state,
    behavior,
    responseGuidance,
    debug: {
      state,
      alias: INTERNAL_SIGNAL_ALIASES[state],
      reason,
    },
  };
}

/**
 * Gastric / stomach signal classifier recovered from the historical Arbor
 * architecture. This is an ephemeral routing signal: it shapes response
 * behavior but is never a durable identity or memory mutation.
 */
export function classifyInternalSignal(input: {
  userMessage: string;
  activeTaskMode?: string | null;
}): InternalSignalClassification {
  const text = normalize(input.userMessage);

  if (
    includesAny(text, [
      "this is too much",
      "too complicated",
      "overwhelmed",
      "stop adding",
      "keep it simple",
      "just the code",
      "quick",
    ])
  ) {
    return result(
      "FULL",
      "Simplify / reduce / stop adding",
      "Simplify. Do not add new architecture unless necessary. Give the smallest useful next step.",
      "User signaled overload or requested simplification.",
    );
  }

  if (
    includesAny(text, [
      "do not proceed",
      "don't proceed",
      "stop this",
      "wrong direction",
      "that's not right",
      "that is not right",
      "i don't want that",
    ])
  ) {
    return result(
      "BLOCKED",
      "Pause / reject / do not proceed",
      "Pause the rejected direction, preserve the parent objective, and choose a corrected route when one is already clear.",
      "User rejected the current direction.",
    );
  }

  if (
    includesAny(text, [
      "are you sure",
      "does that make sense",
      "is that right",
      "weak logic",
      "challenge",
      "push back",
      "just agree",
    ])
  ) {
    return result(
      "SOUR",
      "Question / re-evaluate / challenge",
      "Challenge weak logic, check alignment, and do not default to agreement.",
      "User invited re-evaluation or contradiction handling.",
    );
  }

  if (
    includesAny(text, [
      "unsafe",
      "danger",
      "scared",
      "slow down and verify",
      "check assumptions",
    ])
  ) {
    return result(
      "NERVOUS",
      "Slow down / check assumptions / prioritize safety",
      "Slow down. Verify assumptions. Prioritize safety and agency before continuing.",
      "The current turn signals uncertainty, danger, or a need for verification.",
    );
  }

  if (
    text.length < 8 ||
    includesAny(text, ["idk", "whatever", "hmm", "maybe"])
  ) {
    return result(
      "EMPTY",
      "Seek input / explore",
      "Use existing context first. Ask only when a necessary handle is genuinely missing.",
      "The current message contains little new task information.",
    );
  }

  if (input.activeTaskMode === "code_handoff") {
    return result(
      "FULL",
      "Simplify / reduce / stop adding",
      "Stay practical and avoid unnecessary expansion.",
      "Code handoff mode favors compact transfer.",
    );
  }

  return result(
    "EMPTY",
    "Seek input / explore",
    "Proceed normally while watching for missing context.",
    "No stronger gastric signal was detected.",
  );
}

export function renderInternalSignalBlock(
  signal: InternalSignalClassification,
): string {
  return [
    "GASTRIC / INTERNAL SIGNAL — EPHEMERAL",
    `State: ${signal.state}`,
    `Behavior: ${signal.behavior}`,
    "State influences response routing only.",
    "It does not override truth, safety, reasoning, active objectives, identity, or durable corrections.",
    `Guidance: ${signal.responseGuidance}`,
  ].join("\n");
}

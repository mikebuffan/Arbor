export type ArborWorkStatus =
  | "open"
  | "investigating"
  | "repairing"
  | "verifying"
  | "resolved"
  | "reverted"
  | "blocked";

export type ArborWorkEvidenceSource =
  | "text"
  | "voice"
  | "annabelle"
  | "tool"
  | "test"
  | "runtime"
  | "user_correction";

export type ArborWorkEvidence = {
  id: string;
  source: ArborWorkEvidenceSource;
  summary: string;
  observedAt: string;
  confidence: number;
};

export type ArborWorkState = {
  id: string;
  projectId: string;
  title: string;
  problemKey: string;
  status: ArborWorkStatus;
  hypothesis: string | null;
  hypothesisConfidence: number | null;
  currentGoal: string;
  nextAction: string | null;
  evidence: ArborWorkEvidence[];
  affectedSubsystems: string[];
  attemptedStrategies: string[];
  successCriteria: string[];
  verificationNotes: string[];
  createdAt: string;
  updatedAt: string;
};

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function normalizeWorkEvidence(
  evidence: ArborWorkEvidence,
): ArborWorkEvidence {
  return {
    ...evidence,
    summary: evidence.summary.trim(),
    confidence: clampConfidence(evidence.confidence),
  };
}

export function addWorkEvidence(
  state: ArborWorkState,
  evidence: ArborWorkEvidence,
): ArborWorkState {
  if (state.evidence.some((item) => item.id === evidence.id)) return state;

  const normalized = normalizeWorkEvidence(evidence);

  return {
    ...state,
    evidence: [...state.evidence, normalized],
    updatedAt: normalized.observedAt,
  };
}

export function advanceWorkState(
  state: ArborWorkState,
  input: {
    status: ArborWorkStatus;
    nextAction?: string | null;
    verificationNote?: string;
    attemptedStrategy?: string;
    updatedAt: string;
  },
): ArborWorkState {
  const attemptedStrategies =
    input.attemptedStrategy &&
    !state.attemptedStrategies.includes(input.attemptedStrategy)
      ? [...state.attemptedStrategies, input.attemptedStrategy]
      : state.attemptedStrategies;

  return {
    ...state,
    status: input.status,
    nextAction:
      input.nextAction === undefined ? state.nextAction : input.nextAction,
    attemptedStrategies,
    verificationNotes: input.verificationNote
      ? [...state.verificationNotes, input.verificationNote]
      : state.verificationNotes,
    updatedAt: input.updatedAt,
  };
}

export function setWorkHypothesis(
  state: ArborWorkState,
  hypothesis: string | null,
  confidence: number | null,
  updatedAt: string,
): ArborWorkState {
  return {
    ...state,
    hypothesis: hypothesis?.trim() || null,
    hypothesisConfidence:
      confidence == null ? null : clampConfidence(confidence),
    updatedAt,
  };
}

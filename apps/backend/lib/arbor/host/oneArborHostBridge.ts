import type {
  ArborBehaviorProof,
  ArborInteractionMode,
} from "../behavior/behaviorProjection";

export type ArborAuthority = "arbor" | "annabelle";
export type ArborHostSurface = "text" | "voice";

export type ArborHostCorrection = {
  id: string;
  kind: "behavior" | "acoustic";
  text: string;
  createdAt: string;
};

export type ArborHostWorkItem = {
  id: string;
  title: string;
  status: "open" | "active" | "blocked" | "verifying";
  nextAction: string | null;
};

export type OneArborHostState = {
  schemaVersion: 1;
  sessionId: string;
  projectId: string;
  conversationId: string | null;
  surface: ArborHostSurface;
  authority: ArborAuthority;
  currentGoal: string | null;
  lastMeaningfulUserTurn: string | null;
  lastMeaningfulArborTurn: string | null;
  unresolvedWork: ArborHostWorkItem[];
  corrections: ArborHostCorrection[];
  behaviorProof: ArborBehaviorProof | null;
  updatedAt: string;
};

export type HostStartupProjection = {
  interactionMode: ArborInteractionMode;
  promptBlock: string;
  acousticCorrections: string[];
  behavioralCorrections: string[];
};

const CORRECTION_APPLICATION_POLICY = [
  "Treat corrections as narrow deltas against the canonical Arbor baseline, not as requests to rebuild the whole personality.",
  "Change only the dimension that failed. Preserve passing dimensions such as humor, warmth, directness, judgment, initiative, relationship continuity, and ordinary conversational cadence unless the user corrected that specific dimension.",
  "Do not pendulum-swing after a correction. In particular, do not answer generic/therapeutic drift by becoming robotic, stiff, minimal, excessively profane, or performatively quirky.",
  "After applying the smallest sufficient correction, continue the same conversation, goal, and open loops without socially restarting.",
] as const;

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function resolveInteractionMode(
  state: OneArborHostState,
): ArborInteractionMode {
  if (state.authority === "annabelle") return "annabelle";
  return state.surface;
}

export function projectHostStartup(
  state: OneArborHostState,
): HostStartupProjection {
  const behavioralCorrections = unique(
    state.corrections
      .filter((correction) => correction.kind === "behavior")
      .map((correction) => correction.text),
  );
  const acousticCorrections = unique(
    state.corrections
      .filter((correction) => correction.kind === "acoustic")
      .map((correction) => correction.text),
  );
  const unresolved = state.unresolvedWork.length
    ? state.unresolvedWork
        .map((item) =>
          [
            `- ${item.title}`,
            `[${item.status}]`,
            item.nextAction ? `next=${item.nextAction}` : null,
          ]
            .filter(Boolean)
            .join(" "),
        )
        .join("\n")
    : "- none";
  const behavior = behavioralCorrections.length
    ? behavioralCorrections.map((correction) => `- ${correction}`).join("\n")
    : "- none";
  const correctionPolicy = CORRECTION_APPLICATION_POLICY
    .map((rule) => `- ${rule}`)
    .join("\n");

  return {
    interactionMode: resolveInteractionMode(state),
    behavioralCorrections,
    acousticCorrections,
    promptBlock: [
      "ONE ARBOR HOST CONTINUITY",
      `Surface: ${state.surface}`,
      `Authority: ${state.authority}`,
      `Current goal: ${state.currentGoal ?? "(unknown)"}`,
      `Last meaningful user turn: ${state.lastMeaningfulUserTurn ?? "(unknown)"}`,
      `Last meaningful Arbor turn: ${state.lastMeaningfulArborTurn ?? "(unknown)"}`,
      "Unresolved work:",
      unresolved,
      "Active behavioral corrections:",
      behavior,
      "Correction application policy:",
      correctionPolicy,
      "Continue from this state. Do not socially restart because the surface changed. Do not ask the user to repeat information already represented here.",
    ].join("\n"),
  };
}

export function switchHostSurface(
  state: OneArborHostState,
  surface: ArborHostSurface,
  updatedAt: string,
): OneArborHostState {
  return { ...state, surface, updatedAt };
}

export function switchAuthority(
  state: OneArborHostState,
  authority: ArborAuthority,
  updatedAt: string,
): OneArborHostState {
  return { ...state, authority, updatedAt };
}

export function applyHostCorrection(
  state: OneArborHostState,
  correction: ArborHostCorrection,
): OneArborHostState {
  if (state.corrections.some((item) => item.id === correction.id)) return state;
  return {
    ...state,
    corrections: [...state.corrections, correction],
    updatedAt: correction.createdAt,
  };
}

export function updateMeaningfulTurn(
  state: OneArborHostState,
  input: {
    user?: string;
    arbor?: string;
    currentGoal?: string | null;
    updatedAt: string;
  },
): OneArborHostState {
  return {
    ...state,
    currentGoal:
      input.currentGoal === undefined ? state.currentGoal : input.currentGoal,
    lastMeaningfulUserTurn:
      input.user?.trim() || state.lastMeaningfulUserTurn,
    lastMeaningfulArborTurn:
      input.arbor?.trim() || state.lastMeaningfulArborTurn,
    updatedAt: input.updatedAt,
  };
}

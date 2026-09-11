import type {
  ArborBehaviorProof,
  ArborInteractionMode,
} from "../behavior/behaviorProjection";
import {
  buildVoiceHostAcousticBlock,
  type VoiceAcousticProjection,
  projectVoiceAcoustics,
} from "../voice/acousticProjection";

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
  voiceAcoustics: VoiceAcousticProjection | null;
  voiceAcousticBlock: string | null;
};

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
  const persona = state.authority === "annabelle" ? "annabelle" : "arbor";
  const voiceAcoustics =
    state.surface === "voice"
      ? projectVoiceAcoustics(persona, acousticCorrections)
      : null;

  return {
    interactionMode: resolveInteractionMode(state),
    behavioralCorrections,
    acousticCorrections,
    voiceAcoustics,
    voiceAcousticBlock:
      state.surface === "voice"
        ? buildVoiceHostAcousticBlock(persona, acousticCorrections)
        : null,
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

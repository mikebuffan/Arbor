import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  loadRuntimeState,
  saveRuntimeState,
} from "./runtimeStateStore";

import {
  mergeCorrections,
  type ArborCorrection,
  type ArborRuntimeState,
} from "./runtimeState";

import type {
  ArborBehaviorProof,
} from "../behavior/behaviorProjection";
import type {
  AgencyState,
} from "../agency/engine";
import type {
  PendingSelfUpdate,
} from "../agency/updateLifecycle";
import type {
  ArborSubsystem,
} from "./arborRuntime";

export function carryPendingSelfUpdate(input: {
  priorGoal: string | null;
  nextGoal: string | null;
  priorPending:
    | PendingSelfUpdate
    | null;
  incomingPending?:
    | PendingSelfUpdate
    | null;
}): PendingSelfUpdate | null {
  if (
    input.incomingPending !==
    undefined
  ) {
    return input.incomingPending;
  }

  if (
    input.priorGoal !==
    input.nextGoal
  ) {
    return null;
  }

  return input.priorPending;
}

export async function beginRuntimeSession(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string;

  channel: "text" | "voice";
  activeSubsystem: ArborSubsystem;

  currentGoal?: string | null;
  lastMeaningfulUserTurn?:
    string | null;
  lastMeaningfulArborTurn?:
    string | null;

  agency?: AgencyState | null;

  corrections?: ArborCorrection[];

  behaviorProof?:
    ArborBehaviorProof | null;

  pendingSelfUpdate?:
    PendingSelfUpdate | null;

  now: string;
}): Promise<ArborRuntimeState> {
  const prior =
    await loadRuntimeState(input);

  const currentGoal =
    input.currentGoal ??
    prior?.currentGoal ??
    null;

  const state: ArborRuntimeState = {
    schemaVersion: 1,

    userId: input.userId,
    projectId: input.projectId,
    conversationId:
      input.conversationId,

    channel: input.channel,
    activeSubsystem:
      input.activeSubsystem,

    currentGoal,

    lastMeaningfulUserTurn:
      input.lastMeaningfulUserTurn ??
      prior
        ?.lastMeaningfulUserTurn ??
      null,

    lastMeaningfulArborTurn:
      input.lastMeaningfulArborTurn ??
      prior
        ?.lastMeaningfulArborTurn ??
      null,

    agency:
      input.agency ??
      prior?.agency ??
      null,

    corrections: mergeCorrections(
      prior?.corrections ?? [],
      input.corrections ?? [],
    ),

    behaviorProof:
      input.behaviorProof ??
      prior?.behaviorProof ??
      null,

    pendingSelfUpdate:
      carryPendingSelfUpdate({
        priorGoal:
          prior?.currentGoal ?? null,
        nextGoal: currentGoal,
        priorPending:
          prior
            ?.pendingSelfUpdate ??
          null,
        incomingPending:
          input.pendingSelfUpdate,
      }),

    createdAt:
      prior?.createdAt ??
      input.now,

    updatedAt:
      input.now,
  };

  await saveRuntimeState({
    supabase: input.supabase,
    state,
  });

  return state;
}

export async function updateRuntimeSession(input: {
  supabase: SupabaseClient;
  state: ArborRuntimeState;

  channel?: "text" | "voice";
  activeSubsystem?:
    ArborSubsystem;

  currentGoal?: string | null;

  lastMeaningfulUserTurn?:
    string | null;
  lastMeaningfulArborTurn?:
    string | null;

  agency?: AgencyState | null;

  corrections?: ArborCorrection[];

  behaviorProof?:
    ArborBehaviorProof | null;

  pendingSelfUpdate?:
    PendingSelfUpdate | null;

  now: string;
}): Promise<ArborRuntimeState> {
  const next: ArborRuntimeState = {
    ...input.state,

    channel:
      input.channel ??
      input.state.channel,

    activeSubsystem:
      input.activeSubsystem ??
      input.state.activeSubsystem,

    currentGoal:
      input.currentGoal ===
      undefined
        ? input.state.currentGoal
        : input.currentGoal,

    lastMeaningfulUserTurn:
      input.lastMeaningfulUserTurn ===
      undefined
        ? input.state
            .lastMeaningfulUserTurn
        : input
            .lastMeaningfulUserTurn,

    lastMeaningfulArborTurn:
      input.lastMeaningfulArborTurn ===
      undefined
        ? input.state
            .lastMeaningfulArborTurn
        : input
            .lastMeaningfulArborTurn,

    agency:
      input.agency === undefined
        ? input.state.agency
        : input.agency,

    corrections: mergeCorrections(
      input.state.corrections,
      input.corrections ?? [],
    ),

    behaviorProof:
      input.behaviorProof ===
      undefined
        ? input.state
            .behaviorProof
        : input.behaviorProof,

    pendingSelfUpdate:
      input.pendingSelfUpdate ===
      undefined
        ? input.state
            .pendingSelfUpdate
        : input.pendingSelfUpdate,

    updatedAt:
      input.now,
  };

  await saveRuntimeState({
    supabase: input.supabase,
    state: next,
  });

  return next;
}

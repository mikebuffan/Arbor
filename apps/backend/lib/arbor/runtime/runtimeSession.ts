import type { SupabaseClient } from "@supabase/supabase-js";

import {
  loadRuntimeState,
  saveRuntimeState,
} from "./runtimeStateStore";

import {
  mergeCorrections,
  type ArborCorrection,
  type ArborRuntimeState,
} from "./runtimeState";

import type { ArborBehaviorProof } from "../behavior/behaviorProjection";
import type { AgencyState } from "../agency/engine";
import type { ArborSubsystem } from "./arborRuntime";

export async function beginRuntimeSession(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId: string;

  channel: "text" | "voice";
  activeSubsystem: ArborSubsystem;

  currentGoal?: string | null;
  lastMeaningfulUserTurn?: string | null;
  lastMeaningfulArborTurn?: string | null;

  agency?: AgencyState | null;

  corrections?: ArborCorrection[];

  behaviorProof?: ArborBehaviorProof | null;

  now: string;
}): Promise<ArborRuntimeState> {
  const prior = await loadRuntimeState(input);

  const state: ArborRuntimeState = {
    schemaVersion: 1,

    userId: input.userId,
    projectId: input.projectId,
    conversationId: input.conversationId,

    channel: input.channel,
    activeSubsystem: input.activeSubsystem,

    currentGoal:
      input.currentGoal ??
      prior?.currentGoal ??
      null,

    lastMeaningfulUserTurn:
      input.lastMeaningfulUserTurn ??
      prior?.lastMeaningfulUserTurn ??
      null,

    lastMeaningfulArborTurn:
      input.lastMeaningfulArborTurn ??
      prior?.lastMeaningfulArborTurn ??
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
  activeSubsystem?: ArborSubsystem;

  currentGoal?: string | null;

  lastMeaningfulUserTurn?: string | null;
  lastMeaningfulArborTurn?: string | null;

  agency?: AgencyState | null;

  corrections?: ArborCorrection[];

  behaviorProof?: ArborBehaviorProof | null;

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
      input.currentGoal === undefined
        ? input.state.currentGoal
        : input.currentGoal,

    lastMeaningfulUserTurn:
      input.lastMeaningfulUserTurn === undefined
        ? input.state.lastMeaningfulUserTurn
        : input.lastMeaningfulUserTurn,

    lastMeaningfulArborTurn:
      input.lastMeaningfulArborTurn === undefined
        ? input.state.lastMeaningfulArborTurn
        : input.lastMeaningfulArborTurn,

    agency:
      input.agency === undefined
        ? input.state.agency
        : input.agency,

    corrections: mergeCorrections(
      input.state.corrections,
      input.corrections ?? [],
    ),

    behaviorProof:
      input.behaviorProof === undefined
        ? input.state.behaviorProof
        : input.behaviorProof,

    updatedAt:
      input.now,
  };

  await saveRuntimeState({
    supabase: input.supabase,
    state: next,
  });

  return next;
}

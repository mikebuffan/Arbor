import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyState, AgencyBlocker } from "./engine";
import {
  loadAgencyState,
  persistAgencyState,
} from "./state";
import { loadRuntimeState } from "../runtime/runtimeStateStore";
import { resolveAgencyGoal } from "./continuation";
import { recordStrategyCandidate } from "./strategyRetention";

function resumableAgency(
  value: AgencyState | null | undefined,
): AgencyState | null {
  if (!value) return null;
  return value.status === "active" || value.status === "blocked"
    ? value
    : null;
}

export async function beginAgencySession(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId?: string | null;
  userText: string;
}): Promise<AgencyState> {
  const [projectAgency, conversationRuntime] = await Promise.all([
    loadAgencyState(input),
    input.conversationId
      ? loadRuntimeState({
          supabase: input.supabase,
          userId: input.userId,
          projectId: input.projectId,
          conversationId: input.conversationId,
        })
      : Promise.resolve(null),
  ]);

  // Prefer unfinished work already owned by this conversation. Falling back to
  // project-level state preserves cross-thread continuation, while revisiting an
  // older thread can still recover the unfinished goal that thread owned.
  const prior =
    resumableAgency(conversationRuntime?.agency) ??
    resumableAgency(projectAgency) ??
    projectAgency;

  const { goal, resume } = resolveAgencyGoal(input.userText, prior);

  const agency: AgencyState = {
    goal,
    status: "active",
    currentStep: resume && prior ? prior.currentStep : 0,
    // A newly accepted goal is unfinished until verified otherwise. Persist a
    // concrete ownership marker immediately so a crash/interruption before the
    // first tool call cannot turn active work into an empty state.
    unresolvedWork:
      resume && prior
        ? prior.unresolvedWork.length
          ? prior.unresolvedWork
          : [`complete goal: ${prior.goal}`]
        : [`complete goal: ${goal}`],
    recurringWeaknesses: prior?.recurringWeaknesses ?? [],
    strategyNotes: prior?.strategyNotes ?? [],
    blocker: null,
  };

  await persistAgencyState({
    ...input,
    agency,
  });

  return agency;
}

export async function recordAgencyProgress(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  agency: AgencyState;
  step: number;
  unresolvedWork?: string[];
  recurringWeakness?: string;
  strategyChange?: string;
}): Promise<AgencyState> {
  const strategyUpdate = input.strategyChange
    ? recordStrategyCandidate(
        input.agency.strategyNotes,
        input.strategyChange,
      )
    : null;

  const next: AgencyState = {
    ...input.agency,
    status: "active",
    currentStep: input.step,
    unresolvedWork:
      input.unresolvedWork ?? input.agency.unresolvedWork,
    recurringWeaknesses: input.recurringWeakness
      ? [
          ...input.agency.recurringWeaknesses,
          input.recurringWeakness,
        ].slice(-20)
      : input.agency.recurringWeaknesses,
    strategyNotes:
      strategyUpdate?.notes ??
      input.agency.strategyNotes,
    blocker: null,
  };

  await persistAgencyState({
    supabase: input.supabase,
    userId: input.userId,
    projectId: input.projectId,
    agency: next,
  });

  return next;
}

export async function blockAgencySession(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  agency: AgencyState;
  blocker: AgencyBlocker;
  unresolvedWork: string[];
}): Promise<AgencyState> {
  const next: AgencyState = {
    ...input.agency,
    status: "blocked",
    blocker: input.blocker,
    unresolvedWork: input.unresolvedWork,
  };

  await persistAgencyState({
    supabase: input.supabase,
    userId: input.userId,
    projectId: input.projectId,
    agency: next,
  });

  return next;
}

export async function completeAgencySession(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  agency: AgencyState;
  verified: boolean;
}): Promise<AgencyState> {
  const next: AgencyState = {
    ...input.agency,
    status: input.verified ? "complete" : "active",
    unresolvedWork: input.verified
      ? []
      : input.agency.unresolvedWork,
    blocker: null,
  };

  await persistAgencyState({
    supabase: input.supabase,
    userId: input.userId,
    projectId: input.projectId,
    agency: next,
  });

  return next;
}

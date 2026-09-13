import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyState, AgencyBlocker } from "./engine";
import {
  loadAgencyState,
  persistAgencyState,
} from "./state";
import { resolveAgencyGoal } from "./continuation";
import { recordStrategyCandidate } from "./strategyRetention";
import { mergeAgencyUnresolvedWork } from "./unresolvedWork";

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
  // arbor_runtime_state is the canonical owner of project-level agency.
  // Conversation runtime is a projection used for continuity/rendering; it
  // must never compete with or override the canonical unresolved work graph.
  const projectAgency = await loadAgencyState(input);
  const prior = resumableAgency(projectAgency) ?? projectAgency;

  const { goal, resume } = resolveAgencyGoal(input.userText, prior);

  const agency: AgencyState = {
    goal,
    status: "active",
    currentStep: resume && prior ? prior.currentStep : 0,
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
      input.unresolvedWork === undefined
        ? input.agency.unresolvedWork
        : mergeAgencyUnresolvedWork(
            input.agency.unresolvedWork,
            input.unresolvedWork,
          ),
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
    unresolvedWork: mergeAgencyUnresolvedWork(
      input.agency.unresolvedWork,
      input.unresolvedWork,
    ),
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

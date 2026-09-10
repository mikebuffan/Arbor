import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyState, AgencyBlocker } from "./engine";
import {
  loadAgencyState,
  persistAgencyState,
} from "./state";

const CONTINUATION =
  /^(?:go|okay|ok|continue|keep going|do it|finish it|yes|yep|yeah|please do|carry on)[.!?\s]*$/i;

function compactGoal(userText: string): string {
  return userText.trim().replace(/\s+/g, " ").slice(0, 500);
}

function shouldResumePriorGoal(
  userText: string,
  prior: AgencyState | null,
): boolean {
  if (!prior) return false;
  if (prior.status !== "active" && prior.status !== "blocked") {
    return false;
  }
  return CONTINUATION.test(userText.trim());
}

export async function beginAgencySession(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  userText: string;
}): Promise<AgencyState> {
  const prior = await loadAgencyState(input);
  const resume = shouldResumePriorGoal(input.userText, prior);
  const goal = resume && prior ? prior.goal : compactGoal(input.userText);

  const agency: AgencyState = {
    goal,
    status: "active",
    currentStep: resume && prior ? prior.currentStep : 0,
    unresolvedWork: resume && prior ? prior.unresolvedWork : [],
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
    strategyNotes: input.strategyChange
      ? [
          ...input.agency.strategyNotes,
          input.strategyChange,
        ].slice(-20)
      : input.agency.strategyNotes,
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

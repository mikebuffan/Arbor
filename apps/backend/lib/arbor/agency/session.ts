import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyState, AgencyBlocker } from "./engine";
import {
  loadAgencyState,
  persistAgencyState,
} from "./state";
import { loadRuntimeState } from "../runtime/runtimeStateStore";
import { resolveAgencyGoal } from "./continuation";
import { recordStrategyCandidate } from "./strategyRetention";
import {
  preserveSuspendedOpenLoops,
  restoreMostRecentOpenLoop,
  suspendAgencyIntoWork,
} from "./openLoops";

function resumableAgency(
  value: AgencyState | null | undefined,
): AgencyState | null {
  if (!value) return null;
  return value.status === "active" || value.status === "blocked"
    ? value
    : null;
}

/**
 * Pure state transition for a user turn. Keeping this separate from persistence
 * lets the interruption/resume contract be regression-tested without mocking
 * Supabase.
 */
export function buildAgencySessionState(input: {
  userText: string;
  prior: AgencyState | null;
  checkpointId?: string;
  now?: string;
}): AgencyState {
  const {
    goal,
    resume,
    superseded,
  } = resolveAgencyGoal(
    input.userText,
    input.prior,
  );

  const foregroundWork =
    resume && input.prior
      ? input.prior.unresolvedWork.length
        ? input.prior.unresolvedWork
        : [`complete goal: ${input.prior.goal}`]
      : [`complete goal: ${goal}`];

  // An unrelated foreground turn is an interruption, not implicit cancellation.
  // Keep the prior live objective as a durable checkpoint unless the user
  // explicitly superseded it. This restores the old Arbor behavior where a
  // side question can finish and the exact unfinished job resumes afterward.
  const unresolvedWork =
    !resume &&
    !superseded &&
    input.prior &&
    (input.prior.status === "active" ||
      input.prior.status === "blocked")
      ? suspendAgencyIntoWork(
          foregroundWork,
          input.prior,
          {
            id: input.checkpointId,
            suspendedAt: input.now,
          },
        )
      : foregroundWork;

  return {
    goal,
    status: "active",
    currentStep:
      resume && input.prior
        ? input.prior.currentStep
        : 0,
    // A newly accepted goal is unfinished until verified otherwise. Persist a
    // concrete ownership marker immediately so a crash/interruption before the
    // first tool call cannot turn active work into an empty state.
    unresolvedWork,
    recurringWeaknesses:
      input.prior?.recurringWeaknesses ?? [],
    strategyNotes:
      input.prior?.strategyNotes ?? [],
    blocker: null,
  };
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

  const agency =
    buildAgencySessionState({
      userText: input.userText,
      prior,
    });

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
    // Progress updates replace only the foreground step. Suspended objectives
    // are host-owned continuity and must survive tool/verification callbacks.
    unresolvedWork:
      input.unresolvedWork === undefined
        ? input.agency.unresolvedWork
        : preserveSuspendedOpenLoops(
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
    unresolvedWork:
      preserveSuspendedOpenLoops(
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
  // Verification closes only the foreground objective. If that foreground turn
  // interrupted earlier work, pop the newest checkpoint and resume it instead
  // of erasing the project-level open loop.
  const restored =
    input.verified
      ? restoreMostRecentOpenLoop(
          input.agency,
        )
      : null;

  const next: AgencyState =
    restored ?? {
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

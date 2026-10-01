import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyState, AgencyBlocker, AgencyExecutionState } from "./engine";
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
  splitAgencyWork,
  suspendAgencyIntoWork,
} from "./openLoops";

export function nextObjective(
  prior: AgencyState | null,
  goal: string,
  unresolvedWork: string[],
  resume: boolean,
): AgencyState["objective"] {
  if (resume && prior?.objective) {
    return {
      ...prior.objective,
      parentGoal: prior.objective.parentGoal || goal,
      status: "active",
      nextAction: splitAgencyWork(unresolvedWork).current[0] ??
        prior.objective.nextAction ??
        `continue goal: ${goal}`,
      checkpoint: prior.objective.checkpoint,
      revision: prior.objective.revision + 1,
    };
  }

  return {
    parentGoal: goal,
    completionCriteria: [
      "completion verifier passes",
      "unresolved work is empty",
      "canonical assistant turn is persisted",
    ],
    standingAuthorization: [
      "continue safe reversible in-scope work without another go/okay",
    ],
    hardStops: [
      "irreversible action",
      "high-consequence fork",
      "missing required authorization",
    ],
    nextAction: splitAgencyWork(unresolvedWork).current[0] ??
      `complete goal: ${goal}`,
    checkpoint: "objective accepted",
    status: "active",
    revision: (prior?.objective?.revision ?? 0) + 1,
    execution: null,
  };
}

export function resumableAgency(
  value: AgencyState | null | undefined,
): AgencyState | null {
  if (!value) return null;
  return value.status === "active" ||
    value.status === "blocked" ||
    value.status === "checkpointed"
    ? value
    : null;
}

export function choosePriorAgency(
  projectAgency: AgencyState | null,
  conversationAgency: AgencyState | null | undefined,
): AgencyState | null {
  const project = resumableAgency(projectAgency) ?? projectAgency;
  const conversation = resumableAgency(conversationAgency);
  const projectRevision = project?.objective?.revision ?? 0;
  const conversationRevision = conversation?.objective?.revision ?? 0;
  return conversation && conversationRevision > projectRevision
    ? conversation
    : project ?? conversation;
}

/**
 * Pure transition used by persistence and tests. An unrelated turn is a
 * foreground interruption, not implicit cancellation of unfinished work.
 */
export function buildAgencySessionState(input: {
  userText: string;
  prior: AgencyState | null;
  checkpointId?: string;
  now?: string;
}): AgencyState {
  const { goal, resume, superseded } =
    resolveAgencyGoal(input.userText, input.prior);

  const foregroundWork =
    resume && input.prior
      ? splitAgencyWork(input.prior.unresolvedWork).current.length
        ? input.prior.unresolvedWork
        : [`complete goal: ${input.prior.goal}`]
      : [`complete goal: ${goal}`];

  const unresolvedWork =
    !resume &&
    !superseded &&
    input.prior &&
    resumableAgency(input.prior)
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
    currentStep: resume && input.prior ? input.prior.currentStep : 0,
    unresolvedWork,
    recurringWeaknesses: input.prior?.recurringWeaknesses ?? [],
    strategyNotes: input.prior?.strategyNotes ?? [],
    blocker: null,
    attemptedActionIds: resume ? input.prior?.attemptedActionIds ?? [] : [],
    lastVerification: resume ? input.prior?.lastVerification ?? null : null,
    objective: nextObjective(input.prior, goal, unresolvedWork, resume),
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

  const prior = choosePriorAgency(
    projectAgency,
    conversationRuntime?.agency,
  );

  const agency = buildAgencySessionState({
    userText: input.userText,
    prior,
  });

  await persistAgencyState({
    ...input,
    agency,
    expectedRevision: prior?.objective?.revision,
    expectAbsent: !prior,
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
  execution?: AgencyExecutionState | null;
}): Promise<AgencyState> {
  const strategyUpdate = input.strategyChange
    ? recordStrategyCandidate(
        input.agency.strategyNotes,
        input.strategyChange,
      )
    : null;

  const unresolvedWork =
    input.unresolvedWork === undefined
      ? input.agency.unresolvedWork
      : preserveSuspendedOpenLoops(
          input.agency.unresolvedWork,
          input.unresolvedWork,
        );

  const foreground = splitAgencyWork(unresolvedWork).current;

  const next: AgencyState = {
    ...input.agency,
    status: "active",
    currentStep: input.step,
    unresolvedWork,
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
    objective: input.agency.objective
      ? {
          ...input.agency.objective,
          status: "active",
          nextAction:
            foreground[0] ??
            input.agency.objective.nextAction ??
            `continue goal: ${input.agency.goal}`,
          checkpoint: `step ${input.step} persisted`,
          revision: input.agency.objective.revision + 1,
          execution:
            input.execution === undefined
              ? input.agency.objective.execution ?? null
              : input.execution,
        }
      : undefined,
  };

  await persistAgencyState({
    supabase: input.supabase,
    userId: input.userId,
    projectId: input.projectId,
    agency: next,
    expectedRevision: input.agency.objective?.revision,
    checkpointReason: `progress step ${input.step}`,
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
  const unresolvedWork = preserveSuspendedOpenLoops(
    input.agency.unresolvedWork,
    input.unresolvedWork,
  );
  const foreground = splitAgencyWork(unresolvedWork).current;

  const next: AgencyState = {
    ...input.agency,
    status: "blocked",
    blocker: input.blocker,
    unresolvedWork,
    objective: input.agency.objective
      ? {
          ...input.agency.objective,
          status: "blocked",
          nextAction: foreground[0] ?? null,
          checkpoint: `blocked: ${input.blocker}`,
          revision: input.agency.objective.revision + 1,
        }
      : undefined,
  };

  await persistAgencyState({
    supabase: input.supabase,
    userId: input.userId,
    projectId: input.projectId,
    agency: next,
    expectedRevision: input.agency.objective?.revision,
    checkpointReason: `blocked: ${input.blocker}`,
  });

  return next;
}

export async function checkpointAgencySession(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  agency: AgencyState;
  reason?: string;
}): Promise<AgencyState> {
  const unresolvedWork = input.agency.unresolvedWork.length
    ? input.agency.unresolvedWork
    : [`continue goal: ${input.agency.goal}`];
  const foreground = splitAgencyWork(unresolvedWork).current;

  const next: AgencyState = {
    ...input.agency,
    status: "checkpointed",
    unresolvedWork,
    blocker: null,
    objective: input.agency.objective
      ? {
          ...input.agency.objective,
          status: "checkpointed",
          nextAction:
            foreground[0] ??
            input.agency.objective.nextAction ??
            `continue goal: ${input.agency.goal}`,
          checkpoint: input.reason ?? "execution checkpoint persisted",
          revision: input.agency.objective.revision + 1,
        }
      : undefined,
  };

  await persistAgencyState({
    supabase: input.supabase,
    userId: input.userId,
    projectId: input.projectId,
    agency: next,
    expectedRevision: input.agency.objective?.revision,
    checkpointReason: input.reason ?? "execution checkpoint",
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
  const restored = input.verified
    ? restoreMostRecentOpenLoop(input.agency)
    : null;

  let next: AgencyState;

  if (restored) {
    const currentRevision = input.agency.objective?.revision ?? 0;
    const restoredForeground = splitAgencyWork(restored.unresolvedWork).current;
    next = {
      ...restored,
      objective: restored.objective
        ? {
            ...restored.objective,
            status: restored.status,
            nextAction:
              restoredForeground[0] ??
              restored.objective.nextAction ??
              `continue goal: ${restored.goal}`,
            checkpoint: "resumed suspended objective after foreground completion",
            revision: currentRevision + 1,
            execution: null,
          }
        : nextObjective(
            input.agency,
            restored.goal,
            restored.unresolvedWork,
            false,
          ),
    };
  } else {
    next = {
      ...input.agency,
      status: input.verified ? "complete" : "active",
      unresolvedWork: input.verified
        ? []
        : input.agency.unresolvedWork,
      blocker: null,
      objective: input.agency.objective
        ? {
            ...input.agency.objective,
            status: input.verified ? "complete" : "active",
            nextAction: input.verified
              ? null
              : splitAgencyWork(input.agency.unresolvedWork).current[0] ??
                input.agency.objective.nextAction,
            checkpoint: input.verified
              ? "completion verified and persisted"
              : "completion verification did not pass",
            revision: input.agency.objective.revision + 1,
            execution: input.verified
              ? null
              : input.agency.objective.execution ?? null,
          }
        : undefined,
    };
  }

  await persistAgencyState({
    supabase: input.supabase,
    userId: input.userId,
    projectId: input.projectId,
    agency: next,
    expectedRevision: input.agency.objective?.revision,
    checkpointReason: restored
      ? "foreground complete; suspended objective resumed"
      : input.verified
        ? "completion verified"
        : "completion verification failed",
  });

  return next;
}

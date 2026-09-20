import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyState, AgencyBlocker, AgencyExecutionState } from "./engine";
import {
  loadAgencyState,
  persistAgencyState,
} from "./state";
import { loadRuntimeState } from "../runtime/runtimeStateStore";
import { resolveAgencyGoal } from "./continuation";
import { recordStrategyCandidate } from "./strategyRetention";

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
      nextAction: unresolvedWork[0] ?? prior.objective.nextAction ?? `continue goal: ${goal}`,
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
    nextAction: unresolvedWork[0] ?? `complete goal: ${goal}`,
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
  // Project state is canonical on a revision tie. A conversation may only
  // override it when it is demonstrably newer.
  return conversation && conversationRevision > projectRevision
    ? conversation
    : project ?? conversation;
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

  // Project state is the canonical carrier. A conversation may resume only
  // when it is not older than the project objective. This prevents revisiting
  // an old thread from resurrecting stale work over a newer project checkpoint.
  const prior = choosePriorAgency(
    projectAgency,
    conversationRuntime?.agency,
  );

  const { goal, resume } = resolveAgencyGoal(input.userText, prior);

  const unresolvedWork =
    resume && prior
      ? prior.unresolvedWork.length
        ? prior.unresolvedWork
        : [`complete goal: ${prior.goal}`]
      : [`complete goal: ${goal}`];

  const agency: AgencyState = {
    goal,
    status: "active",
    currentStep: resume && prior ? prior.currentStep : 0,
    // Persist ownership immediately so an interrupted request cannot erase
    // the parent objective before the first tool call.
    unresolvedWork,
    recurringWeaknesses: prior?.recurringWeaknesses ?? [],
    strategyNotes: prior?.strategyNotes ?? [],
    blocker: null,
    objective: nextObjective(prior, goal, unresolvedWork, resume),
  };

  await persistAgencyState({
    ...input,
    agency,
    // Any existing durable objective is revision-owned, including a
    // completed objective being replaced by a new goal. This prevents two
    // simultaneous turns from silently overwriting one another.
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
    input.unresolvedWork ?? input.agency.unresolvedWork;

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
            unresolvedWork[0] ??
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
  const next: AgencyState = {
    ...input.agency,
    status: "blocked",
    blocker: input.blocker,
    unresolvedWork: input.unresolvedWork,
    objective: input.agency.objective
      ? {
          ...input.agency.objective,
          status: "blocked",
          nextAction: input.unresolvedWork[0] ?? null,
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
            unresolvedWork[0] ??
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
  const next: AgencyState = {
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
            : input.agency.unresolvedWork[0] ?? input.agency.objective.nextAction,
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

  await persistAgencyState({
    supabase: input.supabase,
    userId: input.userId,
    projectId: input.projectId,
    agency: next,
    expectedRevision: input.agency.objective?.revision,
    checkpointReason: input.verified
      ? "completion verified"
      : "completion verification failed",
  });

  return next;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { chooseNextWork, scoreWorkState } from "./prioritizer";
import {
  decideRecovery,
  type StatefulRecoveryDecision,
} from "./recovery";
import { listActiveWork, saveWorkState } from "./store";
import {
  addWorkEvidence,
  advanceWorkState,
  type ArborWorkEvidence,
  type ArborWorkState,
} from "./workState";

export type AgencyTick = {
  work: ArborWorkState | null;
  priorityScore: number | null;
  decision: StatefulRecoveryDecision | null;
};

export async function runAgencyTick(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  evidence?: ArborWorkEvidence;
  problemKey?: string;
  failedStrategy?: string | null;
  alternateActions?: string[];
  requiresAuthority?: boolean;
  irreversible?: boolean;
  now: string;
}): Promise<AgencyTick> {
  const active = await listActiveWork(params);
  let chosen = chooseNextWork(active);

  if (!chosen) {
    return { work: null, priorityScore: null, decision: null };
  }

  if (params.evidence && (!params.problemKey || chosen.problemKey === params.problemKey)) {
    chosen = addWorkEvidence(chosen, params.evidence);
  }

  const decision = decideRecovery(chosen, {
    failedStrategy: params.failedStrategy,
    alternateActions: params.alternateActions,
    requiresAuthority: params.requiresAuthority,
    irreversible: params.irreversible,
  });

  const nextStatus =
    decision.kind === "block"
      ? "blocked"
      : chosen.status === "open"
        ? "investigating"
        : chosen.status;

  chosen = advanceWorkState(chosen, {
    status: nextStatus,
    nextAction: decision.nextAction,
    attemptedStrategy: params.failedStrategy ?? undefined,
    updatedAt: params.now,
  });

  chosen = await saveWorkState({
    supabase: params.supabase,
    userId: params.userId,
    state: chosen,
  });

  return {
    work: chosen,
    priorityScore: scoreWorkState(chosen).score,
    decision,
  };
}

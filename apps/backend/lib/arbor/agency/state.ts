import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyState } from "./engine";
import { isMissingRuntimeTable } from "@/lib/arbor/runtime/missingRuntimeTable";

export function normalizeUnresolvedWork(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const text = item.trim();
      if (text) out.push(text);
      continue;
    }

    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const preferred = [
      record.exactNextAction,
      record.objective,
      record.id,
    ].find((candidate) => typeof candidate === "string" && candidate.trim());

    if (typeof preferred === "string") {
      out.push(preferred.trim());
      continue;
    }

    // Keep legacy structured work visible rather than silently erasing it.
    out.push(JSON.stringify(record));
  }

  return Array.from(new Set(out)).filter(Boolean);
}

function toStrings(value: unknown): string[] {
  return normalizeUnresolvedWork(value);
}

export function normalizeObjective(
  value: unknown,
): AgencyState["objective"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const statuses = new Set(["active", "blocked", "checkpointed", "complete"]);
  const revision = Number(record.revision);
  if (
    typeof record.parentGoal !== "string" ||
    !record.parentGoal.trim() ||
    !statuses.has(String(record.status)) ||
    !Number.isInteger(revision) ||
    revision < 0
  ) {
    return undefined;
  }

  const nullableText = (candidate: unknown): string | null =>
    typeof candidate === "string"
      ? candidate
      : candidate === null || candidate === undefined
        ? null
        : null;

  return {
    parentGoal: record.parentGoal.trim(),
    completionCriteria: toStrings(record.completionCriteria),
    standingAuthorization: toStrings(record.standingAuthorization),
    hardStops: toStrings(record.hardStops),
    nextAction: nullableText(record.nextAction),
    checkpoint: nullableText(record.checkpoint),
    status: String(record.status) as NonNullable<AgencyState["objective"]>["status"],
    revision,
  };
}

async function loadLastAgencyCheckpoint(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
}): Promise<AgencyState | null> {
  const { data, error } = await input.supabase
    .from("arbor_agency_checkpoints")
    .select("agency_status,current_step,unresolved_work,objective")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .order("objective_revision", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingRuntimeTable(error)) return null;
    throw error;
  }

  const objective = normalizeObjective(data?.objective);
  if (!data || !objective) return null;

  return {
    goal: objective.parentGoal,
    status: data.agency_status as AgencyState["status"],
    currentStep: Number(data.current_step ?? 0),
    unresolvedWork: toStrings(data.unresolved_work),
    recurringWeaknesses: [],
    strategyNotes: [],
    blocker: null,
    objective,
  };
}

export async function loadAgencyState(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
}): Promise<AgencyState | null> {
  const { data, error } = await input.supabase
    .from("arbor_runtime_state")
    .select(
      "agency_goal,agency_status,agency_current_step,agency_unresolved_work,agency_recurring_weaknesses,agency_strategy_notes,agency_blocker,agency_objective",
    )
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .maybeSingle();

  if (error) {
    if (isMissingRuntimeTable(error)) return null;
    throw error;
  }

  if (!data?.agency_goal || !data?.agency_status) {
    return loadLastAgencyCheckpoint(input);
  }

  const objective = normalizeObjective(data.agency_objective);
  const resumableStatus =
    data.agency_status === "active" ||
    data.agency_status === "blocked" ||
    data.agency_status === "checkpointed";

  // A malformed/missing objective on unfinished work is not silently accepted:
  // recover the last valid append-only checkpoint instead.
  if (resumableStatus && !objective) {
    const recovered = await loadLastAgencyCheckpoint(input);
    if (recovered) return recovered;
  }

  return {
    goal: String(data.agency_goal),
    status: data.agency_status as AgencyState["status"],
    currentStep: Number(data.agency_current_step ?? 0),
    unresolvedWork: toStrings(data.agency_unresolved_work),
    recurringWeaknesses: toStrings(data.agency_recurring_weaknesses),
    strategyNotes: toStrings(data.agency_strategy_notes),
    blocker: (data.agency_blocker as AgencyState["blocker"]) ?? null,
    objective,
  };
}

export class AgencyStateConflictError extends Error {
  constructor() {
    super("agency_state_conflict");
    this.name = "AgencyStateConflictError";
  }
}

export async function persistAgencyState(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  agency: AgencyState;
  expectedRevision?: number;
  expectAbsent?: boolean;
  checkpointReason?: string;
}): Promise<void> {
  if (input.expectAbsent) {
    const { data, error } = await input.supabase.rpc("arbor_claim_agency_state", {
      p_user_id: input.userId,
      p_project_id: input.projectId,
      p_goal: input.agency.goal,
      p_status: input.agency.status,
      p_current_step: input.agency.currentStep,
      p_unresolved_work: input.agency.unresolvedWork,
      p_recurring_weaknesses: input.agency.recurringWeaknesses,
      p_strategy_notes: input.agency.strategyNotes,
      p_blocker: input.agency.blocker ?? null,
      p_objective: input.agency.objective ?? null,
    });

    if (error) {
      if (isMissingRuntimeTable(error)) return;
      throw error;
    }
    if (data !== true) throw new AgencyStateConflictError();
    return;
  }

  if (input.expectedRevision !== undefined) {
    const rpcName = input.checkpointReason
      ? "arbor_record_agency_checkpoint"
      : "arbor_cas_agency_state";
    const rpcArgs = {
      p_user_id: input.userId,
      p_project_id: input.projectId,
      p_expected_revision: input.expectedRevision,
      p_goal: input.agency.goal,
      p_status: input.agency.status,
      p_current_step: input.agency.currentStep,
      p_unresolved_work: input.agency.unresolvedWork,
      p_recurring_weaknesses: input.agency.recurringWeaknesses,
      p_strategy_notes: input.agency.strategyNotes,
      p_blocker: input.agency.blocker ?? null,
      p_objective: input.agency.objective ?? null,
      ...(input.checkpointReason
        ? { p_reason: input.checkpointReason }
        : {}),
    };
    const { data, error } = await input.supabase.rpc(rpcName, rpcArgs);

    if (error) {
      if (isMissingRuntimeTable(error)) return;
      throw error;
    }
    if (data !== true) throw new AgencyStateConflictError();
    return;
  }

  const { error } = await input.supabase
    .from("arbor_runtime_state")
    .upsert(
      {
        user_id: input.userId,
        project_id: input.projectId,
        agency_goal: input.agency.goal,
        agency_status: input.agency.status,
        agency_current_step: input.agency.currentStep,
        agency_unresolved_work: input.agency.unresolvedWork,
        agency_recurring_weaknesses: input.agency.recurringWeaknesses,
        agency_strategy_notes: input.agency.strategyNotes,
        agency_blocker: input.agency.blocker ?? null,
        agency_objective: input.agency.objective ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,project_id" },
    );

  if (error) {
    if (isMissingRuntimeTable(error)) return;
    throw error;
  }
}

export async function clearCompletedAgencyState(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
}): Promise<void> {
  const { error } = await input.supabase
    .from("arbor_runtime_state")
    .update({
      agency_goal: null,
      agency_status: null,
      agency_current_step: 0,
      agency_unresolved_work: [],
      agency_blocker: null,
      agency_objective: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    // Never let a delayed cleanup erase a newer active/checkpointed objective.
    .eq("agency_status", "complete");

  if (error) {
    if (isMissingRuntimeTable(error)) return;
    throw error;
  }
}

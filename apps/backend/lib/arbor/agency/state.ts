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
  if (!data?.agency_goal || !data?.agency_status) return null;

  return {
    goal: String(data.agency_goal),
    status: data.agency_status as AgencyState["status"],
    currentStep: Number(data.agency_current_step ?? 0),
    unresolvedWork: toStrings(data.agency_unresolved_work),
    recurringWeaknesses: toStrings(data.agency_recurring_weaknesses),
    strategyNotes: toStrings(data.agency_strategy_notes),
    blocker: (data.agency_blocker as AgencyState["blocker"]) ?? null,
    objective:
      data.agency_objective && typeof data.agency_objective === "object"
        ? (data.agency_objective as AgencyState["objective"])
        : undefined,
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
}): Promise<void> {
  if (input.expectedRevision !== undefined) {
    const { data, error } = await input.supabase.rpc("arbor_cas_agency_state", {
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
    });
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
    .eq("project_id", input.projectId);

  if (error) {
    if (isMissingRuntimeTable(error)) return;
    throw error;
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyState } from "./engine";
import { isMissingRuntimeTable } from "@/lib/arbor/runtime/missingRuntimeTable";

function toStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function loadAgencyState(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
}): Promise<AgencyState | null> {
  const { data, error } = await input.supabase
    .from("arbor_runtime_state")
    .select(
      "agency_goal,agency_status,agency_current_step,agency_unresolved_work,agency_recurring_weaknesses,agency_strategy_notes,agency_blocker",
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
  };
}

export async function persistAgencyState(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  agency: AgencyState;
}): Promise<void> {
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
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId);

  if (error) {
    if (isMissingRuntimeTable(error)) return;
    throw error;
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ArborWorkEvidence,
  ArborWorkState,
  ArborWorkStatus,
} from "./workState";

type WorkRow = {
  id: string;
  project_id: string;
  title: string;
  problem_key: string;
  status: ArborWorkStatus;
  hypothesis: string | null;
  hypothesis_confidence: number | null;
  current_goal: string;
  next_action: string | null;
  evidence: ArborWorkEvidence[] | null;
  affected_subsystems: string[] | null;
  attempted_strategies: string[] | null;
  success_criteria: string[] | null;
  verification_notes: string[] | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: WorkRow): ArborWorkState {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    problemKey: row.problem_key,
    status: row.status,
    hypothesis: row.hypothesis,
    hypothesisConfidence: row.hypothesis_confidence,
    currentGoal: row.current_goal,
    nextAction: row.next_action,
    evidence: row.evidence ?? [],
    affectedSubsystems: row.affected_subsystems ?? [],
    attemptedStrategies: row.attempted_strategies ?? [],
    successCriteria: row.success_criteria ?? [],
    verificationNotes: row.verification_notes ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listActiveWork(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
}): Promise<ArborWorkState[]> {
  const { data, error } = await params.supabase
    .from("arbor_work_items")
    .select("*")
    .eq("user_id", params.userId)
    .eq("project_id", params.projectId)
    .not("status", "in", '("resolved","reverted")')
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as WorkRow[]).map(fromRow);
}

export async function saveWorkState(params: {
  supabase: SupabaseClient;
  userId: string;
  state: ArborWorkState;
}): Promise<ArborWorkState> {
  const state = params.state;
  const payload = {
    id: state.id,
    user_id: params.userId,
    project_id: state.projectId,
    title: state.title,
    problem_key: state.problemKey,
    status: state.status,
    hypothesis: state.hypothesis,
    hypothesis_confidence: state.hypothesisConfidence,
    current_goal: state.currentGoal,
    next_action: state.nextAction,
    evidence: state.evidence,
    affected_subsystems: state.affectedSubsystems,
    attempted_strategies: state.attemptedStrategies,
    success_criteria: state.successCriteria,
    verification_notes: state.verificationNotes,
    created_at: state.createdAt,
    updated_at: state.updatedAt,
  };

  const { data, error } = await params.supabase
    .from("arbor_work_items")
    .upsert(payload, { onConflict: "user_id,project_id,problem_key" })
    .select("*")
    .single();

  if (error) throw error;
  return fromRow(data as WorkRow);
}

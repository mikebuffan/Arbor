import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type CandidateReinforcementEvent =
  | "injected"
  | "used"
  | "confirmed"
  | "contradicted"
  | "observed";

const DELTAS: Record<CandidateReinforcementEvent, number> = {
  injected: 0.01,
  observed: 0.02,
  used: 0.03,
  confirmed: 0.06,
  contradicted: -0.08,
};

export async function reinforceMemoryCandidate(input: {
  candidateId: string;
  projectId: string;
  userId: string;
  threadId: string;
  event: CandidateReinforcementEvent;
  details?: Record<string, unknown>;
}) {
  const admin = supabaseAdmin();

  const { data: candidate, error: readError } = await admin
    .from("ar_memory_candidates")
    .select("id,candidate_json,status")
    .eq("id", input.candidateId)
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .maybeSingle();

  if (readError) throw readError;
  if (!candidate || candidate.status !== "proposed") {
    return { updated: false };
  }

  const json =
    (candidate.candidate_json ?? {}) as Record<string, unknown>;

  const confidence = Math.max(
    0,
    Math.min(
      1,
      Number(json.confidence ?? 0.2) + DELTAS[input.event],
    ),
  );

  // Use is relevance evidence, not truth confirmation. Only an explicit
  // confirmation may advance confirm_count. Likewise, contradiction records
  // negative evidence without deleting the candidate or durable memories.
  const confirmCount =
    Number(json.confirm_count ?? 0) +
    (input.event === "confirmed" ? 1 : 0);
  const contradictionCount =
    Number(json.contradiction_count ?? 0) +
    (input.event === "contradicted" ? 1 : 0);
  const useCount =
    Number(json.use_count ?? 0) +
    (input.event === "used" ? 1 : 0);

  const next = {
    ...json,
    confidence,
    confirm_count: confirmCount,
    contradiction_count: contradictionCount,
    use_count: useCount,
    last_confirmed_at:
      input.event === "confirmed"
        ? new Date().toISOString()
        : json.last_confirmed_at ?? null,
    last_contradicted_at:
      input.event === "contradicted"
        ? new Date().toISOString()
        : json.last_contradicted_at ?? null,
    last_used_at:
      input.event === "used"
        ? new Date().toISOString()
        : json.last_used_at ?? null,
  };

  const { error: logError } = await admin
    .from("ar_memory_reinforcement")
    .insert({
      user_id: input.userId,
      project_id: input.projectId,
      thread_id: input.threadId,
      candidate_id: input.candidateId,
      decision: input.event,
      details: {
        delta_confidence: DELTAS[input.event],
        ...(input.details ?? {}),
      },
    });

  if (logError) throw logError;

  const { error: updateError } = await admin
    .from("ar_memory_candidates")
    .update({
      candidate_json: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.candidateId)
    .eq("user_id", input.userId);

  if (updateError) throw updateError;

  return {
    updated: true,
    confidence,
    confirmCount,
    contradictionCount,
    useCount,
  };
}

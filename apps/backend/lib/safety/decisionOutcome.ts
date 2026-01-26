import { supabaseAdmin } from "@/lib/supabase/admin";
import { logMemoryEvent } from "@/lib/memory/logger";

export type DecisionOutcomeInput = {
  userId: string;
  projectId: string | null;
  conversationId: string | null;

  severityScore: number;
  riskBand?: string | null;
  emotionalIntensity?: string | null;

  flags: Record<string, any>;

  actionTaken: string;
  model?: string | null;

  postcheckApproved?: boolean;
};

export async function logDecisionOutcome(input: DecisionOutcomeInput) {
  // 1) Keep existing log stream (useful for debugging/retro)
  await logMemoryEvent("decision_outcome", {
    ...input,
    nowIsoUtc: new Date().toISOString(),
  });

  // 2) Durable storage for analytics / future tuning
  const admin = supabaseAdmin();
  const { error } = await admin.from("decision_outcomes").insert({
    user_id: input.userId,
    project_id: input.projectId,
    conversation_id: input.conversationId,

    severity_score: input.severityScore,
    risk_band: input.riskBand ?? null,
    emotional_intensity: input.emotionalIntensity ?? null,

    flags: input.flags ?? {},
    action_taken: input.actionTaken,
    model: input.model ?? null,

    postcheck_approved: input.postcheckApproved ?? null,
  });

  if (error) {
    // Never break chat due to analytics logging
    console.warn("[DECISION OUTCOME INSERT FAILED]", error);
  }
}

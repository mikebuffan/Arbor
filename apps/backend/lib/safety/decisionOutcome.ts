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

  actionTaken: string; // 'none' | 'safety_preface' | 'postcheck_replaced' | etc
  model?: string | null;

  postcheckApproved?: boolean;
};

function safeDiagnosticCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return "unknown";
  }

  const candidate = error.code;
  if (typeof candidate !== "string") return "unknown";

  const code = candidate.slice(0, 32);
  return /^[a-z0-9_]+$/i.test(code) ? code : "unknown";
}

function warnDecisionOutcomeWriteFailure(
  operation: "insert" | "insert_exception",
  error: unknown,
) {
  console.warn("[decision-outcome] write failed", {
    subsystem: "safety",
    operation,
    code: safeDiagnosticCode(error),
    resourceType: "decision_outcomes",
  });
}

export async function logDecisionOutcome(input: DecisionOutcomeInput) {
  // 1) Keep existing log stream
  await logMemoryEvent("decision_outcome", {
    ...input,
    nowIsoUtc: new Date().toISOString(),
  });

  // 2) Durable storage
  try {
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
      warnDecisionOutcomeWriteFailure("insert", error);
    }
  } catch (error: unknown) {
    warnDecisionOutcomeWriteFailure("insert_exception", error);
  }
}

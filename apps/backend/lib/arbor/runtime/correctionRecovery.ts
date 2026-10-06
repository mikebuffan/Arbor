import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArborCorrection } from "./runtimeState";
import { correctionId } from "./corrections";
import { hasExplicitDurableAuthorization } from "@/lib/memory/durableAuthorization";
import { correctionPromotionItem, loadDurableBehaviorCorrections, promoteRepeatedBehaviorCorrections } from "./correctionPromotion";
import { createPostResponseScheduler, type ContinuationRegistrar } from "@/lib/chat/postResponseScheduler";

const PENDING = "behavior_correction_promotion_pending";
const COMPLETE = "behavior_correction_promotion_complete";
const OPS = { kind: "behavior_correction_promotion", version: 1 };
const RECOVERY_LIMIT = 20;

function validateCorrections(value: unknown): ArborCorrection[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3)
    throw new Error("behavior_correction_recovery_invalid_payload");
  return value.map(correction => {
    if (!correction || correction.kind !== "behavior" ||
        typeof correction.value !== "string" || !correction.value.trim() ||
        correction.id !== correctionId("behavior", correction.value) ||
        !["text", "voice", "annabelle"].includes(correction.source) ||
        !Number.isFinite(Date.parse(correction.observedAt)) ||
        !Number.isFinite(correction.confidence) || correction.confidence < 0 || correction.confidence > 1 ||
        !Number.isSafeInteger(correction.occurrences ?? 1) || (correction.occurrences ?? 1) < 1 ||
        typeof correction.protected !== "boolean" || !correctionPromotionItem(correction, true))
      throw new Error("behavior_correction_recovery_invalid_payload");
    return correction as ArborCorrection;
  });
}

function validateRow(row: any, userId: string): ArborCorrection[] {
  if (!row || typeof row.id !== "string" || row.user_id !== userId || row.project_id !== null ||
      ![PENDING, COMPLETE].includes(row.event_type) ||
      row.ops?.kind !== OPS.kind || row.ops?.version !== OPS.version ||
      row.payload?.userId !== userId || row.payload?.explicitlyAuthorized !== true)
    throw new Error("behavior_correction_recovery_scope_or_authorization");
  return validateCorrections(row.payload.corrections);
}

/** Persist explicit authorization before generation/response completion.
 * The existing user-message UUID makes request retries idempotent. */
export async function stageBehaviorCorrectionPromotion(input: {
  supabase: SupabaseClient; userId: string; projectId: string; conversationId: string;
  userMessageId: string; currentUserText: string; corrections: ArborCorrection[];
}): Promise<ArborCorrection[]> {
  if (!hasExplicitDurableAuthorization(input.currentUserText)) return input.corrections;
  const eligible = input.corrections.filter(c => correctionPromotionItem(c, true));
  if (!eligible.length) return input.corrections;
  validateCorrections(eligible);
  const { error } = await input.supabase.from("memory_pending").upsert({
    id: input.userMessageId, user_id: input.userId, project_id: null,
    question: "memory_event", event_type: PENDING, ops: OPS,
    payload: { userId: input.userId, projectId: input.projectId,
      conversationId: input.conversationId, explicitlyAuthorized: true, corrections: eligible },
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
  const { data, error: readError } = await input.supabase.from("memory_pending")
    .select("id,user_id,project_id,event_type,ops,payload")
    .eq("id", input.userMessageId).eq("user_id", input.userId).maybeSingle();
  if (readError) throw readError;
  if (!data) throw new Error("behavior_correction_recovery_stage_readback_failed");
  const saved = validateRow(data, input.userId);
  if (data.payload.projectId !== input.projectId || data.payload.conversationId !== input.conversationId ||
      saved.length !== eligible.length || saved.some(c => !eligible.some(x => x.id === c.id && x.value === c.value)))
    throw new Error("behavior_correction_recovery_turn_mismatch");
  const byId = new Map(saved.map(c => [c.id, c]));
  return input.corrections.map(c => byId.get(c.id) ?? c);
}

function retryable(error: unknown): boolean {
  const candidate = error as { code?: unknown; status?: unknown; cause?: { code?: unknown } } | null;
  const code = String(candidate?.code ?? candidate?.cause?.code ?? "");
  const status = Number(candidate?.status);
  return ["40001", "40P01", "55P03", "PGRST003", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"].includes(code) ||
    /^08/.test(code) || status === 429 || (status >= 500 && status <= 599);
}
async function retryTransient(operation: () => Promise<void>, pause: (ms: number) => Promise<void>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { await operation(); return; }
    catch (error) {
      if (attempt === 2 || !retryable(error)) throw error;
      await pause(100 * (attempt + 1));
    }
  }
}
function safeCode(error: unknown): string {
  const code = String((error as { code?: unknown } | null)?.code ?? "recovery_failed");
  return /^[a-z0-9_]{1,32}$/i.test(code) ? code : "recovery_failed";
}

/** Bounded replay from the existing ledger; no worker or execution activation.
 * Unacknowledged jobs remain durable for a later authenticated request. */
export async function recoverPendingBehaviorCorrections(input: {
  supabase: SupabaseClient; userId: string;
  pause?: (ms: number) => Promise<void>;
}): Promise<{ completed: number; failed: number; deferred: boolean }> {
  const { data, error } = await input.supabase.from("memory_pending")
    .select("id,user_id,project_id,event_type,ops,payload")
    .eq("user_id", input.userId).is("project_id", null).eq("event_type", PENDING)
    .contains("ops", OPS).order("ops->>lastAttemptAt", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true }).order("id", { ascending: true })
    .limit(RECOVERY_LIMIT + 1);
  if (error) throw error;
  const rows = data ?? [];
  let completed = 0, failed = 0;
  const pause = input.pause ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  for (const row of rows.slice(0, RECOVERY_LIMIT)) {
    try {
      const corrections = validateRow(row, input.userId);
      await retryTransient(async () => {
        // Authorization was captured and verified at staging, not inferred from
        // the new chat's text or from an ordinary runtime snapshot.
        const result = await promoteRepeatedBehaviorCorrections({
          supabase: input.supabase, userId: input.userId, corrections,
          currentUserText: "Remember this",
        });
        if (result.promoted.length) {
          const retrieved = await loadDurableBehaviorCorrections(input);
          for (const key of result.promoted) {
            const expected = corrections.find(c => correctionPromotionItem(c, true)?.key === key)!;
            const actual = retrieved.find(c => correctionPromotionItem(c, true)?.key === key);
            if (!actual || Date.parse(actual.observedAt) < Date.parse(expected.observedAt) ||
                (Date.parse(actual.observedAt) === Date.parse(expected.observedAt) && actual.value !== expected.value.trim()))
              throw new Error("behavior_correction_recovery_readback_failed");
          }
        }
        const { data: acknowledged, error: ackError } = await input.supabase.from("memory_pending")
          .update({ event_type: COMPLETE }).eq("id", row.id).eq("user_id", input.userId)
          .is("project_id", null).eq("event_type", PENDING).contains("ops", OPS).select("id");
        if (ackError) throw ackError;
        if (!acknowledged?.length) {
          const { data: current, error: currentError } = await input.supabase.from("memory_pending")
            .select("id,user_id,project_id,event_type,ops,payload").eq("id", row.id)
            .eq("user_id", input.userId).maybeSingle();
          if (currentError) throw currentError;
          if (!current) throw new Error("behavior_correction_recovery_ack_failed");
          validateRow(current, input.userId);
          if (current.event_type !== COMPLETE) throw new Error("behavior_correction_recovery_ack_failed");
        }
      }, pause);
      completed++;
    } catch (failure) {
      failed++;
      console.warn("[behavior-correction] recovery deferred", { code: safeCode(failure) });
      // Rotate failed jobs behind never-attempted/older attempts. A bounded
      // window of broken jobs must not starve later authorized saves.
      try {
        const { error: attemptError } = await input.supabase.from("memory_pending")
          .update({ ops: { ...OPS, lastAttemptAt: new Date().toISOString() } })
          .eq("id", row.id).eq("user_id", input.userId).is("project_id", null)
          .eq("event_type", PENDING).contains("ops", OPS);
        if (attemptError) throw attemptError;
      } catch (attemptFailure) {
        console.warn("[behavior-correction] attempt marker deferred", { code: safeCode(attemptFailure) });
      }
    }
  }
  return { completed, failed, deferred: rows.length > RECOVERY_LIMIT };
}

export function schedulePendingBehaviorCorrectionRecovery(input: {
  supabase: SupabaseClient; userId: string; registerContinuation?: ContinuationRegistrar;
}) {
  const scheduler = createPostResponseScheduler(input.registerContinuation);
  scheduler.schedule("memory_pipeline", () => recoverPendingBehaviorCorrections(input));
  scheduler.commit();
}

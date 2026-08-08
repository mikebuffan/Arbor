import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TelemetryPayload } from "@/lib/arbor/telemetry/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_CODE_PATTERN = /^[a-z0-9_]+$/i;
const SAFETY_TIERS = new Set(["none", "low", "medium", "high", "critical"]);

function boundedNumber(value: number | undefined, max: number) {
  if (value == null || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(0, Math.round(value)));
}

function boundedUuid(value: string | undefined | null) {
  return value && UUID_PATTERN.test(value) ? value : null;
}

function boundedUuidList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string =>
      typeof item === "string" && UUID_PATTERN.test(item),
    )
    .slice(0, 50);
}

function boundedCodes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string =>
      typeof item === "string" &&
      item.length <= 48 &&
      SAFE_CODE_PATTERN.test(item),
    )
    .slice(0, 20);
}

function safeFailureCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return "unknown";
  }
  const code = String(error.code).slice(0, 32);
  return SAFE_CODE_PATTERN.test(code) ? code : "unknown";
}

function safeProofSnapshot(proofSnapshot: Record<string, unknown>) {
  const safetyTier = String(proofSnapshot.safety_tier ?? "none");
  return {
    injected_anchor_ids: boundedUuidList(proofSnapshot.injected_anchor_ids),
    injected_memory_item_ids: boundedUuidList(
      proofSnapshot.injected_memory_item_ids,
    ),
    safety_tier: SAFETY_TIERS.has(safetyTier) ? safetyTier : "none",
    logic_gates_hit: boundedCodes(proofSnapshot.logic_gates_hit),
  };
}

export async function buildTelemetry(
  payload: TelemetryPayload,
  proofSnapshot: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const traceId = boundedUuid(payload.traceId);
  const userId = boundedUuid(payload.userId);
  const projectId = boundedUuid(payload.projectId);
  const threadId = boundedUuid(payload.threadId);
  const episodeId = boundedUuid(payload.episodeId);

  if (!traceId || !userId || !projectId || !threadId) {
    console.warn("[telemetry] write failed", {
      subsystem: "telemetry",
      operation: "trace_logs_insert",
      code: "invalid_server_context",
      resourceType: "trace_log",
    });
    return { ok: false, code: "invalid_server_context" };
  }

  try {
    const { error } = await supabaseAdmin().from("trace_logs").insert({
      id: traceId,
      user_id: userId,
      project_id: projectId,
      thread_id: threadId,
      episode_id: episodeId,
      logic_gates_hit: boundedCodes(payload.logicGatesHit),
      proof_snapshot: safeProofSnapshot(proofSnapshot),
      retrieval_latency_ms: boundedNumber(payload.retrievalLatencyMs, 300_000),
      prompt_tokens: boundedNumber(payload.promptTokens, 1_000_000),
      completion_tokens: boundedNumber(payload.completionTokens, 1_000_000),
    });

    if (error) {
      const code = safeFailureCode(error);
      console.warn("[telemetry] write failed", {
        subsystem: "telemetry",
        operation: "trace_logs_insert",
        code,
        traceId,
        resourceType: "trace_log",
      });
      return { ok: false, code };
    }

    return { ok: true };
  } catch (caught) {
    const code = safeFailureCode(caught);
    console.warn("[telemetry] write failed", {
      subsystem: "telemetry",
      operation: "trace_logs_insert",
      code,
      traceId,
      resourceType: "trace_log",
    });
    return { ok: false, code };
  }
}

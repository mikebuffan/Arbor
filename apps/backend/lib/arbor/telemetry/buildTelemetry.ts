import { SupabaseClient } from '@supabase/supabase-js';
import { TelemetryPayload } from './types';

export async function buildTelemetry(
  supabase: SupabaseClient,
  payload: TelemetryPayload,
  proofSnapshot: Record<string, any>
) {
  try {
    await supabase.from('trace_logs').insert({
      id: payload.traceId,
      user_id: payload.userId,
      project_id: payload.projectId,
      thread_id: payload.threadId,
      episode_id: payload.episodeId,
      logic_gates_hit: payload.logicGatesHit ?? [],
      proof_snapshot: proofSnapshot,
      retrieval_latency_ms: payload.retrievalLatencyMs,
      prompt_tokens: payload.promptTokens,
      completion_tokens: payload.completionTokens,
    });
  } catch (err) {
    console.error('[telemetry] trace_logs insert failed', err);
  }
}

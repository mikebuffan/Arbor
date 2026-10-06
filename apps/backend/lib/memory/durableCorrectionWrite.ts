import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryItem } from "./types";

const KEYS = new Set([
  "behavior.correction.agency-followthrough",
  "behavior.correction.identity-drift",
  "behavior.correction.continuity",
]);
export function isDurableBehaviorCorrection(item: MemoryItem): boolean {
  return KEYS.has(item.key.trim());
}

function observation(value: unknown): number {
  const payload = value as Record<string, unknown> | null;
  const timestamp = typeof payload?.last_observed_at === "string"
    ? Date.parse(payload.last_observed_at) : NaN;
  if (!Number.isFinite(timestamp) || typeof payload?.text !== "string" || !payload.text.trim())
    throw new Error("durable_behavior_write_invalid_payload");
  return timestamp;
}

/** Conditional database writes, not a process-local lock. The existing
 * UNIQUE(user_id,key) constraint arbitrates first inserts. */
export async function writeDurableBehaviorCorrection(input: {
  supabase: SupabaseClient; userId: string; item: MemoryItem;
  embedding: number[]; now: string;
}): Promise<"created" | "updated" | "ignored" | "locked"> {
  const { supabase, userId, item, embedding, now } = input;
  const key = item.key.trim();
  if (!KEYS.has(key) || item.scope !== "global" || item.memory_kind !== "correction")
    throw new Error("durable_behavior_write_invalid_scope");
  const incomingTime = observation(item.value);
  const value = item.value as Record<string, unknown>;
  if (value.family !== key.slice("behavior.correction.".length))
    throw new Error("durable_behavior_write_invalid_family");

  for (let attempt = 0; attempt < 3; attempt++) {
    // Read all scopes for this exact owner/key so a conflicting project row
    // cannot be converted into global memory.
    const { data: existing, error: readError } = await supabase.from("memory_items")
      .select("*").eq("user_id", userId).eq("key", key).maybeSingle();
    if (readError) throw readError;
    if (existing) {
      if (existing.user_id !== userId || existing.key !== key || existing.scope !== "global" ||
          existing.project_id !== null || existing.conversation_id !== null)
        throw new Error("durable_behavior_write_scope_mismatch");
      // Background replay must never revive a revoked or locked rule.
      if (existing.deleted_at !== null || existing.status === "tombstoned") return "ignored";
      if (existing.status !== "active") throw new Error("durable_behavior_write_invalid_status");
      if (existing.locked) return "locked";
      if (incomingTime <= observation(existing.value)) return "ignored";

      const { data, error } = await supabase.from("memory_items").update({
        value, embedding, tier: "core", pinned: true, importance: 10,
        confidence: item.confidence, memory_kind: "correction",
        salience: item.salience ?? 1, user_trigger_only: false,
        mention_count: Number(existing.mention_count ?? 0) + 1,
        last_seen_at: now, last_reinforced_at: now, updated_at: now,
      }).eq("id", existing.id).eq("user_id", userId).eq("key", key)
        .eq("scope", "global").is("project_id", null).is("conversation_id", null)
        .eq("status", "active").is("deleted_at", null).eq("locked", false)
        .eq("value", JSON.stringify(existing.value)).select("id");
      if (error) throw error;
      if (data?.length === 1 && data[0].id === existing.id) return "updated";
      if (data?.length) throw new Error("durable_behavior_write_invalid_readback");
      // A concurrent write/revocation won, or RLS denied the mutation.
      // Re-read and compare; never claim a zero-row write succeeded.
      continue;
    }

    const { data, error } = await supabase.from("memory_items").insert({
      user_id: userId, project_id: null, conversation_id: null, key, value,
      embedding, tier: "core", scope: "global", memory_kind: "correction",
      pinned: true, locked: false, importance: 10, confidence: item.confidence,
      salience: item.salience ?? 1, user_trigger_only: false,
      status: "active", deleted_at: null, mention_count: 0, correction_count: 0,
      recurrence_count: 1, promotion_score: 0, promoted_at: null,
      last_seen_at: now, last_reinforced_at: now, updated_at: now,
    }).select("id");
    if (error) {
      if (error.code === "23505") continue;
      throw error;
    }
    if (data?.length === 1 && typeof data[0].id === "string") return "created";
    throw new Error("durable_behavior_write_invalid_readback");
  }
  throw new Error("durable_behavior_write_contention");
}

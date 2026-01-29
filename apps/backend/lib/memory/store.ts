import { supabaseAdmin, safeQuery } from "@/lib/supabase/admin";
import { LOCK_ON_CORRECTION_COUNT } from "@/lib/memory/rules";
import type { MemoryItem, MemoryUpsertResult } from "@/lib/memory/types";
import { embedText, memoryToEmbedString } from "@/lib/memory/embeddings";
import { logMemoryEvent } from "@/lib/memory/logger";
import { getServerSupabase } from "@/lib/supabase/server";

const ITEMS_TABLE = "memory_items";
const EVENTS_TABLE = "memory_pending";

function toJsonValue(v: any): Record<string, any> {
  if (typeof v === "string") return { text: v };
  if (v && typeof v === "object") return v;
  return {};
}

function normalizeEmbedding(emb: any): number[] {
  if (Array.isArray(emb)) return emb;
  if (emb?.data && Array.isArray(emb.data)) return emb.data;
  if (emb?.embedding && Array.isArray(emb.embedding)) return emb.embedding;
  return [];
}

async function findExisting(params: { authedUserId: string; key: string }) {
  const admin = supabaseAdmin();
  const { authedUserId, key } = params;

  const { data, error } = await admin
    .from(ITEMS_TABLE)
    .select("*")
    .eq("user_id", authedUserId)
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function logEvent(params: {
  authedUserId: string;
  projectId: string | null;
  key: string;
  event_type: string;
  payload: any;
}) {
  const admin = supabaseAdmin();
  const { authedUserId, projectId, key, event_type, payload } = params;

  const { error } = await admin.from(EVENTS_TABLE).insert({
    user_id: authedUserId,
    project_id: projectId,
    question: "memory_event",
    ops: { kind: "memory_event", event_type },
    memory_key: key,
    event_type,
    payload,
  });

  if (error) console.warn("memory_pending insert failed:", error);
}

export async function upsertMemoryItems(
  authedUserId: string,
  items: MemoryItem[],
  projectId: string | null = null
): Promise<MemoryUpsertResult> {
  const start = Date.now();

  const result = await safeQuery<MemoryUpsertResult>(
    async (_client) => {
      const admin = supabaseAdmin();
      const res: MemoryUpsertResult = { created: [], updated: [], locked: [], ignored: [] };

      for (const item of items) {
        const key = item.key?.trim();
        if (!key) continue;

        const nowIso = new Date().toISOString();

        const value = toJsonValue(item.value);
        const tier = item.tier ?? "normal";
        const user_trigger_only = !!item.user_trigger_only;
        const importance = Number(item.importance ?? 5);
        const confidence = Number(item.confidence ?? 0.75);
        const pinned = tier === "core";

        const rawEmbedding = await embedText(memoryToEmbedString(key, item.value));
        const embedding = normalizeEmbedding(rawEmbedding);

        const existing = await findExisting({ authedUserId, key });

        if (!existing) {
          const { error } = await admin.from(ITEMS_TABLE).insert({
            user_id: authedUserId,
            project_id: projectId,
            key,
            value,
            tier,
            scope: item.scope ?? "conversation",
            user_trigger_only,
            importance,
            confidence,
            locked: false,
            pinned,
            status: "active",
            deleted_at: null,
            mention_count: 0,
            correction_count: 0,
            last_seen_at: nowIso,
            last_reinforced_at: nowIso,
            updated_at: nowIso,
            embedding,
          });

          if (error) throw error;

          await logEvent({
            authedUserId,
            projectId,
            key,
            event_type: "create",
            payload: { key, tier, user_trigger_only, importance, confidence },
          });

          res.created.push(key);
          continue;
        }

        if (existing.locked) {
          const { error } = await admin
            .from(ITEMS_TABLE)
            .update({
              mention_count: Number(existing.mention_count ?? 0) + 1,
              last_seen_at: nowIso,
              last_reinforced_at: nowIso,
              updated_at: nowIso,
            })
            .eq("id", existing.id);

          if (error) throw error;

          await logEvent({
            authedUserId,
            projectId,
            key,
            event_type: "locked_ignore",
            payload: { reason: "locked", attempted_value: value },
          });

          res.ignored.push(key);
          res.locked.push(key);
          continue;
        }

        const { error } = await admin
          .from(ITEMS_TABLE)
          .update({
            project_id: projectId ?? existing.project_id ?? null,
            value,
            tier: tier ?? existing.tier ?? "normal",
            scope: item.scope ?? existing.scope ?? "conversation",
            user_trigger_only,
            importance: Math.max(Number(existing.importance ?? 5), importance),
            confidence,
            pinned: pinned || !!existing.pinned,
            mention_count: Number(existing.mention_count ?? 0) + 1,
            last_seen_at: nowIso,
            last_reinforced_at: nowIso,
            updated_at: nowIso,
            embedding,
          })
          .eq("id", existing.id);

        if (error) throw error;

        await logEvent({
          authedUserId,
          projectId,
          key,
          event_type: "update",
          payload: { before: existing.value, after: value },
        });

        res.updated.push(key);
      }

      return res;
    },
    "upsertMemoryItems"
  );

  const duration = Date.now() - start;
  await logMemoryEvent("upsert_summary", {
    items: items.length,
    created: result.created.length,
    updated: result.updated.length,
    duration,
  });

  return result;
}

export async function correctMemoryItem(params: {
  authedUserId: string;
  key: string;
  newValue: Record<string, any> | string;
  projectId?: string | null;
}) {
  const admin = supabaseAdmin();
  const { authedUserId, key, newValue } = params;
  const projectId = params.projectId ?? null;

  const cleanKey = key.trim();
  if (!cleanKey) return { locked: false };

  const nowIso = new Date().toISOString();
  const value = toJsonValue(newValue);

  const rawEmbedding = await embedText(memoryToEmbedString(cleanKey, newValue));
  const embedding = normalizeEmbedding(rawEmbedding);

  const existing = await findExisting({ authedUserId, key: cleanKey });

  if (!existing) {
    const { error } = await admin.from(ITEMS_TABLE).insert({
      user_id: authedUserId,
      project_id: projectId,
      key: cleanKey,
      value,
      tier: "core",
      scope: "global",
      user_trigger_only: false,
      importance: 10,
      confidence: 1.0,
      locked: false,
      pinned: true,
      status: "active",
      deleted_at: null,
      mention_count: 0,
      correction_count: 1,
      last_seen_at: nowIso,
      last_reinforced_at: nowIso,
      updated_at: nowIso,
      embedding,
    });

    if (error) throw error;

    await logEvent({
      authedUserId,
      projectId,
      key: cleanKey,
      event_type: "correct_create",
      payload: { newValue: value, correction_count: 1 },
    });

    return { locked: false };
  }

  const nextCorrectionCount = Number(existing.correction_count ?? 0) + 1;
  const shouldLock = nextCorrectionCount >= LOCK_ON_CORRECTION_COUNT;

  const { error } = await admin
    .from(ITEMS_TABLE)
    .update({
      project_id: projectId ?? existing.project_id ?? null,
      value,
      embedding,
      correction_count: nextCorrectionCount,
      locked: shouldLock,
      tier: "core",
      pinned: true,
      importance: 10,
      confidence: 1.0,
      mention_count: Number(existing.mention_count ?? 0) + 1,
      last_seen_at: nowIso,
      last_reinforced_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", existing.id);

  if (error) throw error;

  await logEvent({
    authedUserId,
    projectId,
    key: cleanKey,
    event_type: shouldLock ? "lock" : "correct",
    payload: { newValue: value, correction_count: nextCorrectionCount },
  });

  return { locked: shouldLock };
}

export async function updateMemoryStrength(memoryId: string, delta: number) {
  const supabase = await getServerSupabase();

  const inc = Math.max(1, Math.round(delta * 10));

  const nowIso = new Date().toISOString();

  const { data: existing, error: readErr } = await supabase
    .from(ITEMS_TABLE)
    .select("id, mention_count")
    .eq("id", memoryId)
    .maybeSingle();

  if (readErr) throw readErr;
  if (!existing) return null;

  const next = Number(existing.mention_count ?? 0) + inc;

  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .update({
      mention_count: next,
      last_seen_at: nowIso,
      last_reinforced_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", memoryId)
    .select("id, mention_count")
    .maybeSingle();

  if (error) throw error;

  await logMemoryEvent("reinforce", { memoryId, delta, mention_count: next });
  return data;
}

export async function reinforceMemoryUse(
  authedUserId: string,
  keysUsed: string[],
  projectId: string | null = null
) {
  const admin = supabaseAdmin();
  if (!keysUsed.length) return;

  const nowIso = new Date().toISOString();

  for (const key of keysUsed) {
    const cleanKey = key.trim();
    if (!cleanKey) continue;

    const existing = await findExisting({ authedUserId, key: cleanKey });
    if (!existing || existing.locked) continue;

    const nextCount = Number(existing.mention_count ?? 0) + 1;

    const { error } = await admin
      .from(ITEMS_TABLE)
      .update({
        mention_count: nextCount,
        last_seen_at: nowIso,
        last_reinforced_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", existing.id);

    if (error) throw error;

    await logEvent({
      authedUserId,
      projectId,
      key: cleanKey,
      event_type: "reinforce",
      payload: { mention_count: nextCount },
    });
  }
}

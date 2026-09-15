import type { SupabaseClient } from "@supabase/supabase-js";
import { LOCK_ON_CORRECTION_COUNT } from "@/lib/memory/rules";
import type { MemoryItem, MemoryUpsertResult } from "@/lib/memory/types";
import { embedText, embedTexts, memoryToEmbedString } from "@/lib/memory/embeddings";
import { logMemoryEvent } from "@/lib/memory/logger";
import { getServerSupabase } from "@/lib/supabase/server";
import { computePatternPromotion } from "@/lib/memory/patternPromotion";
import { findPatternHopTarget } from "@/lib/memory/patternMerge";

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

async function findExisting(params: {
  supabase: SupabaseClient;
  authedUserId: string;
  projectId: string | null;
  conversationId?: string | null;
  scope?: "global" | "project" | "conversation";
  key: string;
}) {
  const {
    supabase,
    authedUserId,
    projectId,
    conversationId = null,
    scope = projectId ? "project" : "global",
    key,
  } = params;

  let query = supabase
    .from(ITEMS_TABLE)
    .select("*")
    .eq("user_id", authedUserId)
    .eq("key", key)
    .eq("scope", scope);

  if (scope === "global") {
    query = query.is("project_id", null).is("conversation_id", null);
  } else if (scope === "project") {
    if (!projectId) return null;
    query = query.eq("project_id", projectId).is("conversation_id", null);
  } else {
    if (!projectId || !conversationId) return null;
    query = query
      .eq("project_id", projectId)
      .eq("conversation_id", conversationId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data;
}

async function findPatternHopExisting(params: {
  supabase: SupabaseClient;
  authedUserId: string;
  projectId: string | null;
  conversationId: string | null;
  scope: "global" | "project" | "conversation";
  key: string;
  value: unknown;
}) {
  let query = params.supabase
    .from(ITEMS_TABLE)
    .select("*")
    .eq("user_id", params.authedUserId)
    .eq("scope", params.scope)
    .in("memory_kind", ["pattern_candidate", "pattern"])
    .in("status", ["pending", "active"])
    .is("deleted_at", null);

  if (params.scope === "global") {
    query = query
      .is("project_id", null)
      .is("conversation_id", null);
  } else if (params.scope === "project") {
    if (!params.projectId) return null;
    query = query
      .eq("project_id", params.projectId)
      .is("conversation_id", null);
  } else {
    if (!params.projectId || !params.conversationId) return null;
    query = query
      .eq("project_id", params.projectId)
      .eq("conversation_id", params.conversationId);
  }

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(40);

  if (error) throw error;

  return findPatternHopTarget({
    incomingKey: params.key,
    incomingValue: params.value,
    rows: (data ?? []).map((row: any) => ({
      id: String(row.id),
      key: String(row.key ?? ""),
      value: row.value,
      memory_kind: row.memory_kind ?? null,
      confidence: row.confidence ?? null,
      salience: row.salience ?? null,
      recurrence_count: row.recurrence_count ?? null,
      status: row.status ?? null,
    })),
  });
}

async function logEvent(params: {
  supabase: SupabaseClient;
  authedUserId: string;
  projectId: string | null;
  key: string;
  event_type: string;
  payload: any;
}) {
  const {
    supabase,
    authedUserId,
    projectId,
    key,
    event_type,
    payload,
  } = params;

  const { error } = await supabase.from(EVENTS_TABLE).insert({
    user_id: authedUserId,
    project_id: projectId,
    question: "memory_event",
    ops: { kind: "memory_event", event_type },
    memory_key: key,
    event_type,
    payload,
  });

  if (error) {
    const candidateCode =
      typeof error.code === "string" ? error.code.slice(0, 32) : "unknown";
    const code = /^[a-z0-9_]+$/i.test(candidateCode)
      ? candidateCode
      : "unknown";
    console.warn("[memory] write failed", {
      subsystem: "memory",
      operation: "pending_event_insert",
      code,
      resourceType: EVENTS_TABLE,
    });
  }
}

export async function upsertMemoryItems(
  authedUserId: string,
  items: MemoryItem[],
  projectId: string | null,
  supabase: SupabaseClient,
  conversationId: string | null = null,
): Promise<MemoryUpsertResult> {
  const start = Date.now();
  const res: MemoryUpsertResult = {
    created: [],
    updated: [],
    locked: [],
    ignored: [],
  };

  const prepared = items
    .map((item) => {
      const key = item.key?.trim();
      if (!key) return null;
      return { item, key, embedStr: memoryToEmbedString(key, item.value) };
    })
    .filter(Boolean) as Array<{
    item: MemoryItem;
    key: string;
    embedStr: string;
  }>;

  if (!prepared.length) return res;

  let batched: number[][] | null = null;
  try {
    batched = await embedTexts(prepared.map((p) => p.embedStr));
  } catch {
    console.warn("[memory] embedding failed", {
      subsystem: "memory",
      operation: "batch_embedding",
      code: "provider_error",
      resourceType: "embedding_batch",
      fallback: "per_item",
    });
    batched = null;
  }

  for (let i = 0; i < prepared.length; i++) {
    const { item, key } = prepared[i];

    const nowIso = new Date().toISOString();
    const value = toJsonValue(item.value);
    const tier = item.tier ?? "normal";
    const user_trigger_only = !!item.user_trigger_only;
    let importance = Number(item.importance ?? 5);
    let confidence = Number(item.confidence ?? 0.75);
    const requestedKind = item.memory_kind ?? "fact";
    let memoryKind = requestedKind;
    let salience = Number(item.salience ?? 0.5);
    let recurrenceCount = 1;
    let promotionScore = 0;
    let promotedAt: string | null = null;
    let status = "active";
    const pinned = tier === "core";
    const scope = item.scope ?? "conversation";
    const scopedConversationId =
      scope === "conversation" ? conversationId : null;

    // Do not create ambiguous conversation-scoped rows.
    if (scope === "conversation" && !scopedConversationId) {
      res.ignored.push(key);
      continue;
    }

    const rawEmbedding =
      batched?.[i] ?? (await embedText(memoryToEmbedString(key, item.value)));
    const embedding = normalizeEmbedding(rawEmbedding);

    let existing = await findExisting({
      supabase,
      authedUserId,
      projectId,
      conversationId: scopedConversationId,
      scope,
      key,
    });

    if (!existing && requestedKind === "pattern_candidate") {
      existing = await findPatternHopExisting({
        supabase,
        authedUserId,
        projectId,
        conversationId: scopedConversationId,
        scope,
        key,
        value,
      });
    }

    if (!existing) {
      if (requestedKind === "pattern_candidate") {
        const promotion = computePatternPromotion({
          currentRecurrenceCount: 0,
          confidence,
          salience,
          importance,
        });
        memoryKind = promotion.nextKind;
        recurrenceCount = promotion.nextRecurrenceCount;
        promotionScore = promotion.promotionScore;
        status = promotion.nextStatus;
        importance = promotion.nextImportance;
        confidence = promotion.nextConfidence;
        salience = promotion.nextSalience;
        promotedAt = promotion.promote ? nowIso : null;
      }

      const { error } = await supabase.from(ITEMS_TABLE).insert({
        user_id: authedUserId,
        project_id: scope === "global" ? null : projectId,
        conversation_id: scopedConversationId,
        key,
        value,
        tier,
        scope,
        user_trigger_only,
        importance,
        confidence,
        memory_kind: memoryKind,
        recurrence_count: recurrenceCount,
        salience,
        promotion_score: promotionScore,
        promoted_at: promotedAt,
        locked: false,
        pinned,
        status,
        deleted_at: null,
        mention_count: 0,
        correction_count: 0,
        last_seen_at: nowIso,
        last_reinforced_at: nowIso,
        updated_at: nowIso,
        embedding: mergedEmbedding,
      });
      if (error) throw error;

      await logEvent({
        supabase,
        authedUserId,
        projectId: scope === "global" ? null : projectId,
        key,
        event_type: "create",
        payload: {
          key,
          tier,
          user_trigger_only,
          importance,
          confidence,
          memory_kind: memoryKind,
          recurrence_count: recurrenceCount,
          promotion_score: promotionScore,
          status,
        },
      });

      res.created.push(key);
      continue;
    }

    const existingKind = String(existing.memory_kind ?? "fact");
    const isPatternSignal =
      requestedKind === "pattern_candidate" ||
      existingKind === "pattern_candidate" ||
      existingKind === "pattern";

    if (isPatternSignal) {
      if (existingKind === "pattern") {
        memoryKind = "pattern";
        recurrenceCount = Number(existing.recurrence_count ?? 1) + 1;
        promotionScore = Math.max(
          Number(existing.promotion_score ?? 0.72),
          0.72,
        );
        status = "active";
        importance = Math.max(Number(existing.importance ?? 8), importance, 8);
        confidence = Math.max(Number(existing.confidence ?? 0.82), confidence, 0.82);
        salience = Math.max(Number(existing.salience ?? 0.75), salience, 0.75);
        promotedAt = existing.promoted_at ?? nowIso;
      } else {
        const promotion = computePatternPromotion({
          currentRecurrenceCount: Number(existing.recurrence_count ?? 1),
          confidence: Math.max(Number(existing.confidence ?? 0.7), confidence),
          salience: Math.max(Number(existing.salience ?? 0.5), salience),
          importance: Math.max(Number(existing.importance ?? 6), importance),
        });
        memoryKind = promotion.nextKind;
        recurrenceCount = promotion.nextRecurrenceCount;
        promotionScore = promotion.promotionScore;
        status = promotion.nextStatus;
        importance = promotion.nextImportance;
        confidence = promotion.nextConfidence;
        salience = promotion.nextSalience;
        promotedAt = promotion.promote
          ? nowIso
          : existing.promoted_at ?? null;
      }
    } else {
      memoryKind = requestedKind;
      recurrenceCount = Number(existing.recurrence_count ?? 1);
      promotionScore = Number(existing.promotion_score ?? 0);
      promotedAt = existing.promoted_at ?? null;
      status =
        existing.status === "tombstoned"
          ? "active"
          : String(existing.status ?? "active");
    }

    const canonicalKey = String(existing.key ?? key);
    const hoppedPattern = canonicalKey !== key && isPatternSignal;
    const replacePatternValue =
      !isPatternSignal ||
      confidence >= Number(existing.confidence ?? 0);
    const mergedValue =
      replacePatternValue ? value : existing.value;
    const mergedEmbedding =
      replacePatternValue ? embedding : existing.embedding;

    if (existing.locked) {
      const { error } = await supabase
        .from(ITEMS_TABLE)
        .update({
          mention_count: Number(existing.mention_count ?? 0) + 1,
          last_seen_at: nowIso,
          last_reinforced_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", existing.id)
        .eq("user_id", authedUserId);
      if (error) throw error;

      await logEvent({
        supabase,
        authedUserId,
        projectId: scope === "global" ? null : projectId,
        key,
        event_type: "locked_ignore",
        payload: { reason: "locked" },
      });

      res.ignored.push(key);
      res.locked.push(key);
      continue;
    }

    const { error } = await supabase
      .from(ITEMS_TABLE)
      .update({
        project_id:
          scope === "global"
            ? null
            : projectId ?? existing.project_id ?? null,
        conversation_id: scopedConversationId,
        value: mergedValue,
        tier: tier ?? existing.tier ?? "normal",
        scope,
        user_trigger_only,
        importance: Math.max(Number(existing.importance ?? 5), importance),
        confidence,
        memory_kind: memoryKind,
        recurrence_count: recurrenceCount,
        salience,
        promotion_score: promotionScore,
        promoted_at: promotedAt,
        status,
        pinned: pinned || !!existing.pinned,
        mention_count: Number(existing.mention_count ?? 0) + 1,
        last_seen_at: nowIso,
        last_reinforced_at: nowIso,
        updated_at: nowIso,
        embedding,
      })
      .eq("id", existing.id)
      .eq("user_id", authedUserId);

    if (error) throw error;

    await logEvent({
      supabase,
      authedUserId,
      projectId: scope === "global" ? null : projectId,
      key: canonicalKey,
      event_type:
        memoryKind === "pattern" && existingKind !== "pattern"
          ? "pattern_promoted"
          : hoppedPattern
            ? "pattern_hop_merge"
            : "update",
      payload: {
        changed: true,
        incoming_key: key,
        canonical_key: canonicalKey,
        pattern_hop: hoppedPattern,
        memory_kind: memoryKind,
        recurrence_count: recurrenceCount,
        promotion_score: promotionScore,
        status,
      },
    });

    res.updated.push(canonicalKey);
  }

  const duration = Date.now() - start;
  await logMemoryEvent("upsert_summary", {
    items: items.length,
    created: res.created.length,
    updated: res.updated.length,
    duration,
  });

  return res;
}

export async function correctMemoryItem(params: {
  supabase: SupabaseClient;
  authedUserId: string;
  key: string;
  newValue: Record<string, any> | string;
  projectId?: string | null;
}): Promise<{ id: string | null; locked: boolean }> {
  const { supabase, authedUserId, key, newValue } = params;
  const projectId = params.projectId ?? null;

  const cleanKey = key.trim();
  if (!cleanKey) return { id: null, locked: false };

  const nowIso = new Date().toISOString();
  const value = toJsonValue(newValue);

  const rawEmbedding = await embedText(memoryToEmbedString(cleanKey, newValue));
  const embedding = normalizeEmbedding(rawEmbedding);

  const existing = await findExisting({
    supabase,
    authedUserId,
    projectId,
    conversationId: null,
    scope: projectId ? "project" : "global",
    key: cleanKey,
  });

  if (!existing) {
    const { data, error } = await supabase
      .from(ITEMS_TABLE)
      .insert({
      user_id: authedUserId,
      project_id: projectId,
      key: cleanKey,
      value,
      tier: "core",
      scope: projectId ? "project" : "global",
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
      })
      .select("id")
      .single();

    if (error) throw error;

    await logEvent({
      supabase,
      authedUserId,
      projectId,
      key: cleanKey,
      event_type: "correct_create",
      payload: { correction_count: 1 },
    });

    return { id: data.id as string, locked: false };
  }

  const nextCorrectionCount = Number(existing.correction_count ?? 0) + 1;
  const shouldLock = nextCorrectionCount >= LOCK_ON_CORRECTION_COUNT;

  const { data, error } = await supabase
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
    .eq("id", existing.id)
    .eq("user_id", authedUserId)
    .select("id")
    .single();

  if (error) throw error;

  await logEvent({
    supabase,
    authedUserId,
    projectId,
    key: cleanKey,
    event_type: shouldLock ? "lock" : "correct",
    payload: { correction_count: nextCorrectionCount },
  });

  return { id: data.id as string, locked: shouldLock };
}

export async function supersedeMemoryAliases(params: {
  supabase: SupabaseClient;
  authedUserId: string;
  projectId: string | null;
  canonicalId: string;
  aliases: Array<{ id: string; key: string }>;
}): Promise<string[]> {
  const aliases = params.aliases.filter(
    (alias) => alias.id && alias.id !== params.canonicalId,
  );
  if (!aliases.length) return [];

  const aliasIds = Array.from(new Set(aliases.map((alias) => alias.id)));
  const nowIso = new Date().toISOString();
  let query = params.supabase
    .from(ITEMS_TABLE)
    .update({
      status: "tombstoned",
      deleted_at: nowIso,
      delete_reason: "superseded_by_correction",
      updated_at: nowIso,
    })
    .eq("user_id", params.authedUserId)
    .eq("status", "active")
    .is("deleted_at", null)
    .in("id", aliasIds);

  query = params.projectId
    ? query.eq("project_id", params.projectId).neq("scope", "global")
    : query.is("project_id", null).eq("scope", "global");

  const { data, error } = await query.select("id,key");
  if (error) throw error;

  const affected = (data ?? []) as Array<{ id: string; key: string }>;
  const affectedIds = affected.map((row) => row.id).sort();
  if (
    affectedIds.length !== aliasIds.length ||
    affectedIds.some((id, index) => id !== [...aliasIds].sort()[index])
  ) {
    throw new Error("memory_alias_supersession_incomplete");
  }

  for (const alias of affected) {
    await logEvent({
      supabase: params.supabase,
      authedUserId: params.authedUserId,
      projectId: params.projectId,
      key: alias.key,
      event_type: "superseded_by_correction",
      payload: {
        canonical_id: params.canonicalId,
        reason: "explicit_correction",
      },
    });
  }

  return affectedIds;
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
  projectId: string | null,
  supabase: SupabaseClient,
  conversationId: string | null = null,
) {
  if (!keysUsed.length) return;

  const nowIso = new Date().toISOString();

  for (const key of keysUsed) {
    const cleanKey = key.trim();
    if (!cleanKey) continue;

    const conversationExisting =
      projectId && conversationId
        ? await findExisting({
            supabase,
            authedUserId,
            projectId,
            conversationId,
            scope: "conversation",
            key: cleanKey,
          })
        : null;

    const projectExisting =
      !conversationExisting && projectId
        ? await findExisting({
            supabase,
            authedUserId,
            projectId,
            conversationId: null,
            scope: "project",
            key: cleanKey,
          })
        : null;

    const globalExisting =
      !conversationExisting && !projectExisting
        ? await findExisting({
            supabase,
            authedUserId,
            projectId: null,
            conversationId: null,
            scope: "global",
            key: cleanKey,
          })
        : null;

    const existing =
      conversationExisting ?? projectExisting ?? globalExisting;
    if (!existing || existing.locked) continue;

    const nextCount = Number(existing.mention_count ?? 0) + 1;

    const { error } = await supabase
      .from(ITEMS_TABLE)
      .update({
        mention_count: nextCount,
        last_seen_at: nowIso,
        last_reinforced_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", existing.id)
      .eq("user_id", authedUserId);

    if (error) throw error;

    await logEvent({
      supabase,
      authedUserId,
      projectId,
      key: cleanKey,
      event_type: "reinforce",
      payload: { mention_count: nextCount },
    });
  }
}

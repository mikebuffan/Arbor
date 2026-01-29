// 🔧 Purpose: Retrieves memory context with semantic or normal recall, caching results.
// 🧠 Notes:
// - Keeps your 3-minute cache and full record parsing.
// - Adds retry protection via safeQuery for vector RPC calls.

import { supabaseAdmin, safeQuery } from "@/lib/supabase/admin";
import { openAIEmbed } from "@/lib/providers/openai";

const memoryCache = new Map<string, any>();
const CACHE_TTL = 1000 * 60 * 3;
const cacheExpiry = new Map<string, number>();

function parseMaybeJson(s: any) {
  if (typeof s !== "string") return s;
  const t = s.trim();
  if (!t) return s;
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try { return JSON.parse(t); } catch { return s; }
  }
  return s;
}

function avoidingNull(display: any, key: string, val: string) {
  return display ?? `${key}: ${val}`;
}

export async function getMemoryContext(params: {
  authedUserId: string;
  projectId?: string | null;
  latestUserText: string;
  useVectorSearch?: boolean;
  useCache?: boolean;
}) {
  const { authedUserId, projectId, latestUserText, useVectorSearch = false, useCache = true } = params;

  const cacheKey = `${authedUserId}:${projectId || "none"}`;
  const now = Date.now();
  if (useCache && memoryCache.has(cacheKey) && (cacheExpiry.get(cacheKey) || 0) > now) {
    return memoryCache.get(cacheKey);
  }

  const admin = supabaseAdmin();
  let items: any[] = [];

  if (useVectorSearch && latestUserText?.length > 10) {
    const embedding = await openAIEmbed(latestUserText);
    const { data, error }: { data: any[] | null; error: any } = await safeQuery(
    async (c) => {
      const { data, error } = await c.rpc("match_memory_items", {
        p_user_id: authedUserId,
        p_query_embedding: embedding,
        p_match_count: 30,
        p_tiers: ["core", "normal", "sensitive"],
        p_include_user_trigger_only: true,
      });
      return { data, error };
    },
    "match_memory_items"
  );


    if (error) throw error;
    items = (data ?? []).filter((r: any) => r?.scope !== "anchor" && r?.kind !== "anchor" && r?.kind !== "correction");
  } else {
    const q = admin
      .from("memory_items")
      .select("id, user_id, project_id, conversation_id, key, value, tier, user_trigger_only, importance, confidence, locked, pinned, status, deleted_at, last_seen_at, last_reinforced_at")
      .eq("user_id", authedUserId)
      .is("deleted_at", null)
      .eq("status", "active")
      .neq("scope", "anchor")
      .neq("kind", "anchor")
      .neq("kind", "correction")
      .order("pinned", { ascending: false })
      .order("importance", { ascending: false })
      .order("last_reinforced_at", { ascending: false })
      .limit(50);

    const { data, error } = projectId ? await q.eq("project_id", projectId) : await q;
    if (error) throw error;
    items = (data ?? []).filter((r: any) => r?.scope !== "anchor");
  }

  const parsed = items.map((r: any) => ({
    id: r.id,
    key: r.key,
    value: r.value, // jsonb already
    tier: r.tier ?? (r.pinned ? "core" : "normal"),
    user_trigger_only: !!r.user_trigger_only,
    importance: Number(r.importance ?? 5),
    confidence: Number(r.confidence ?? 0.75),
    pinned: !!r.pinned,
    locked: !!r.locked,
  }));

  const result = {
    core: parsed.filter((i) => i.tier === "core" || i.pinned),
    normal: parsed.filter((i) => i.tier === "normal" && !i.user_trigger_only && !i.pinned),
    sensitive: parsed.filter((i) => i.tier === "sensitive" || i.user_trigger_only),
    keysUsed: [],
  };

  if (useCache) {
    memoryCache.set(cacheKey, result);
    cacheExpiry.set(cacheKey, now + CACHE_TTL);
  }

  return result;
}


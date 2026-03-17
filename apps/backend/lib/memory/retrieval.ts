import { supabaseAdmin, safeQuery } from "@/lib/supabase/admin";
import { openAIEmbed } from "@/lib/providers/openai";

export type RetrievedMemoryItem = {
  id: string;
  key: string;
  value: Record<string, any>;
  tier: "core" | "normal" | "sensitive";
  scope: "global" | "project" | "conversation";
  user_trigger_only: boolean;
  importance: number;
  confidence: number;
  pinned: boolean;
  locked: boolean;
  status: string;
  deleted_at: string | null;
  last_seen_at: string | null;
  last_reinforced_at: string | null;
  updated_at: string | null;
  similarity?: number;
  content_text: string;
};

export type MemoryContextResult = {
  core: RetrievedMemoryItem[];
  normal: RetrievedMemoryItem[];
  sensitive: RetrievedMemoryItem[];
  keysUsed: string[];
};

const memoryCache = new Map<string, MemoryContextResult>();
const CACHE_TTL = 1000 * 60 * 3;
const cacheExpiry = new Map<string, number>();

function stableCacheKey(params: {
  authedUserId: string;
  projectId?: string | null;
  latestUserText: string;
  useVectorSearch: boolean;
}) {
  const normalized = params.latestUserText
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 240);

  return [
    params.authedUserId,
    params.projectId ?? "none",
    params.useVectorSearch ? "vector" : "direct",
    normalized,
  ].join(":");
}

function toPlainObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") return { text: value };
  return {};
}

function contentTextForRow(row: { key?: string | null; value?: any }) {
  const value = toPlainObject(row.value);
  const explicit = typeof value.text === "string" ? value.text.trim() : "";
  if (explicit) return explicit;

  const serialized = Object.keys(value).length ? JSON.stringify(value) : "{}";
  return `${row.key ?? "memory"}: ${serialized}`;
}

function normalizeRow(row: any): RetrievedMemoryItem {
  return {
    id: String(row.id),
    key: String(row.key ?? "").trim(),
    value: toPlainObject(row.value),
    tier: (row.tier ?? (row.pinned ? "core" : "normal")) as RetrievedMemoryItem["tier"],
    scope: (row.scope ?? "conversation") as RetrievedMemoryItem["scope"],
    user_trigger_only: !!row.user_trigger_only,
    importance: Number(row.importance ?? 5),
    confidence: Number(row.confidence ?? 0.75),
    pinned: !!row.pinned,
    locked: !!row.locked,
    status: String(row.status ?? "active"),
    deleted_at: row.deleted_at ?? null,
    last_seen_at: row.last_seen_at ?? null,
    last_reinforced_at: row.last_reinforced_at ?? null,
    updated_at: row.updated_at ?? null,
    similarity: typeof row.similarity === "number" ? row.similarity : undefined,
    content_text: contentTextForRow(row),
  };
}

function isLiveRow(row: any) {
  return row && row.status === "active" && row.deleted_at == null;
}

export async function getMemoryContext(params: {
  authedUserId: string;
  projectId?: string | null;
  latestUserText: string;
  useVectorSearch?: boolean;
  useCache?: boolean;
}) {
  const {
    authedUserId,
    projectId,
    latestUserText,
    useVectorSearch = false,
    useCache = true,
  } = params;

  console.log("[getMemoryContext] called", {
    authedUserId,
    projectId,
    latestUserText,
    useVectorSearch,
    useCache,
  });

  const cacheKey = stableCacheKey({
    authedUserId,
    projectId,
    latestUserText,
    useVectorSearch,
  });

  const now = Date.now();
  if (useCache && memoryCache.has(cacheKey) && (cacheExpiry.get(cacheKey) || 0) > now) {
    return memoryCache.get(cacheKey)!;
  }

  const admin = supabaseAdmin();
  let items: RetrievedMemoryItem[] = [];

  if (useVectorSearch && latestUserText.trim().length > 10) {
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
    items = (data ?? []).filter(isLiveRow).map(normalizeRow);
  } else {
    let q = admin
      .from("memory_items")
      .select(
        "id, user_id, project_id, conversation_id, key, value, tier, scope, user_trigger_only, importance, confidence, locked, pinned, status, deleted_at, last_seen_at, last_reinforced_at, updated_at"
      )
      .eq("user_id", authedUserId)
      .is("deleted_at", null)
      .eq("status", "active")
      .order("pinned", { ascending: false })
      .order("importance", { ascending: false })
      .order("last_reinforced_at", { ascending: false })
      .limit(50);

    if (projectId) {
      q = q.or(`project_id.eq.${projectId},scope.eq.global`);
    }

    const { data, error } = await q;
    if (error) throw error;

    items = (data ?? []).filter(isLiveRow).map(normalizeRow);
  }

  const result: MemoryContextResult = {
    core: items.filter((i) => i.tier === "core" || i.pinned),
    normal: items.filter((i) => i.tier === "normal" && !i.user_trigger_only && !i.pinned),
    sensitive: items.filter((i) => i.tier === "sensitive" || i.user_trigger_only),
    keysUsed: items.map((i) => i.key).filter(Boolean),
  };

  if (useCache && memoryCache.has(cacheKey) && (cacheExpiry.get(cacheKey) || 0) > now) {
    console.log("[getMemoryContext] cache hit", { cacheKey });
    return memoryCache.get(cacheKey)!;
  }

  if (useCache) {
    memoryCache.set(cacheKey, result);
    cacheExpiry.set(cacheKey, now + CACHE_TTL);
  }

  console.log("[getMemoryContext] result", {
    core: result.core.map((i) => ({ id: i.id, key: i.key, tier: i.tier })),
    normal: result.normal.map((i) => ({ id: i.id, key: i.key, tier: i.tier })),
    sensitive: result.sensitive.map((i) => ({ id: i.id, key: i.key, tier: i.tier })),
    keysUsed: result.keysUsed,
  });

  return result;
}
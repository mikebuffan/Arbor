import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/memory/embeddings";
import { rerankMemoryItems } from "@/lib/memory/scoring";

export type RetrievedMemoryItem = {
  id: string;
  project_id: string | null;
  conversation_id?: string | null;
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

function toPlainObject(value: any): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") return { text: value };
  return {};
}

function contentTextForRow(row: { key?: string | null; value?: any; content_text?: string | null }) {
  const provided = typeof row.content_text === "string" ? row.content_text.trim() : "";
  if (provided) return provided;

  const value = toPlainObject(row.value);
  const explicit = typeof value.text === "string" ? value.text.trim() : "";
  if (explicit) return explicit;

  const serialized = Object.keys(value).length ? JSON.stringify(value) : "{}";
  return `${row.key ?? "memory"}: ${serialized}`;
}

function normalizeRow(row: any): RetrievedMemoryItem {
  return {
    id: String(row.id),
    project_id: row.project_id ? String(row.project_id) : null,
    conversation_id: row.conversation_id ? String(row.conversation_id) : null,
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

export function isMemoryInRuntimeScope(
  item: Pick<RetrievedMemoryItem, "project_id" | "conversation_id" | "scope">,
  projectId: string | null,
  conversationId: string | null,
) {
  if (item.scope === "global") {
    // Historical global rows may still carry a project_id. Scope is authoritative.
    return true;
  }

  if (item.scope === "project") {
    return projectId !== null && item.project_id === projectId;
  }

  if (projectId === null || item.project_id !== projectId) return false;

  // Current v2 memory keys are unique per user, not per conversation.
  // conversation_id is provenance/priority metadata, not a visibility wall.
  // Hiding a same-project memory because another thread last wrote the same key
  // would break cross-thread continuity and make a durable memory "move" between
  // conversations. True per-thread isolation requires a different key/index
  // contract and must not be simulated here.
  void conversationId;
  return true;
}

export function isMemoryInProjectScope(
  item: Pick<RetrievedMemoryItem, "project_id" | "scope">,
  projectId: string | null,
) {
  if (item.scope === "global") return true;
  if (projectId) return item.project_id === projectId;
  return item.project_id == null;
}

function dedupeById(items: RetrievedMemoryItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export async function getMemoryContext(params: {
  supabase: SupabaseClient;
  authedUserId: string;
  projectId?: string | null;
  conversationId?: string | null;
  latestUserText: string;
  useVectorSearch?: boolean;
  useCache?: boolean;
}) {
  const {
    supabase,
    authedUserId,
    projectId = null,
    conversationId = null,
    latestUserText,
    useVectorSearch = false,
  } = params;

  // Compatibility input only. Retrieval caching is disabled until correction,
  // upsert, deletion, and cross-instance invalidation are all proven safe.
  void params.useCache;

  let fallbackQuery = supabase
    .from("memory_items")
    .select(
      "id, user_id, project_id, conversation_id, key, value, tier, scope, user_trigger_only, importance, confidence, locked, pinned, status, deleted_at, last_seen_at, last_reinforced_at, updated_at"
    )
    .eq("user_id", authedUserId)
    .is("deleted_at", null)
    .eq("status", "active")
    .or("pinned.eq.true,locked.eq.true,tier.eq.core")
    .order("pinned", { ascending: false })
    .order("importance", { ascending: false })
    .order("last_reinforced_at", { ascending: false })
    .limit(32);

  if (projectId) {
    fallbackQuery = fallbackQuery.or(`project_id.eq.${projectId},scope.eq.global`);
  } else {
    fallbackQuery = fallbackQuery.is("project_id", null);
  }

  const { data: fallbackData, error: fallbackError } = await fallbackQuery;
  if (fallbackError) throw fallbackError;

  let vectorRows: any[] = [];

  const canVectorSearch =
    useVectorSearch &&
    latestUserText.trim().length >= 8;

  if (canVectorSearch) {
    const queryEmbedding = await embedText(latestUserText);

    const { data, error } = await supabase.rpc("match_memory_items", {
      p_include_user_trigger_only: false,
      p_match_count: 40,
      p_project_id: projectId,
      p_conversation_id: conversationId,
      p_query_embedding: queryEmbedding,
      p_tiers: ["core", "normal", "sensitive"],
      p_user_id: authedUserId,
    });

    if (error) throw error;
    vectorRows = rerankMemoryItems((data ?? []).map(normalizeRow), 24);
  }

  const items = dedupeById([
    ...(fallbackData ?? []).map(normalizeRow),
    ...vectorRows,
  ])
    .filter(isLiveRow)
    .filter((item) =>
      isMemoryInRuntimeScope(item, projectId, conversationId),
    );

  const result: MemoryContextResult = {
    core: items.filter((i) => i.tier === "core" || i.pinned),
    normal: items.filter((i) => i.tier === "normal" && !i.user_trigger_only && !i.pinned),
    sensitive: items.filter((i) => i.tier === "sensitive" || i.user_trigger_only),
    keysUsed: items.map((i) => i.key).filter(Boolean),
  };

  return result;
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type RetrievedMemoryItem = {
  id: string;
  project_id: string | null;
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
    project_id: row.project_id ? String(row.project_id) : null,
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

export function isMemoryInProjectScope(
  item: Pick<RetrievedMemoryItem, "project_id" | "scope">,
  projectId: string | null,
) {
  if (item.scope === "global") return true;
  if (projectId) return item.project_id === projectId;
  return item.project_id == null;
}

export async function getMemoryContext(params: {
  supabase: SupabaseClient;
  authedUserId: string;
  projectId?: string | null;
  latestUserText: string;
  useVectorSearch?: boolean;
  useCache?: boolean;
}) {
  const {
    supabase,
    authedUserId,
    projectId,
    latestUserText,
    useVectorSearch = false,
  } = params;

  // Compatibility input only. Retrieval caching is disabled until correction,
  // upsert, deletion, and cross-instance invalidation are all proven safe.
  void params.useCache;
  // The live match_memory_items RPC accepts a user ID but neither accepts a
  // project ID nor returns project_id. Until that contract is corrected under
  // an approved migration, vector results cannot be safely project-filtered.
  void latestUserText;
  void useVectorSearch;

  let items: RetrievedMemoryItem[] = [];

  let q = supabase
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

  items = (data ?? [])
    .filter(isLiveRow)
    .map(normalizeRow)
    .filter((item) => isMemoryInProjectScope(item, projectId ?? null));

  const result: MemoryContextResult = {
    core: items.filter((i) => i.tier === "core" || i.pinned),
    normal: items.filter((i) => i.tier === "normal" && !i.user_trigger_only && !i.pinned),
    sensitive: items.filter((i) => i.tier === "sensitive" || i.user_trigger_only),
    keysUsed: items.map((i) => i.key).filter(Boolean),
  };

  return result;
}

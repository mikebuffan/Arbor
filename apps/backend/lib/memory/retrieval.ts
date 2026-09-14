import type { SupabaseClient } from "@supabase/supabase-js";
import { openAIEmbed } from "@/lib/providers/openai";

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
  const explicit =
    typeof value.text === "string"
      ? value.text.trim()
      : typeof value.value === "string"
        ? value.value.trim()
        : "";
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

function hoursSince(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return (Date.now() - time) / 3_600_000;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function memoryStabilityScore(item: RetrievedMemoryItem): number {
  const similarity = clamp01(item.similarity ?? 0);
  const importance = clamp01((item.importance - 1) / 9);
  const hours = Math.min(
    hoursSince(item.last_reinforced_at ?? item.last_seen_at ?? item.updated_at),
    24 * 30,
  );
  const recency = Number.isFinite(hours)
    ? Math.exp(-hours / (24 * 7))
    : 0;

  return (
    similarity * 0.60 +
    importance * 0.20 +
    recency * 0.10 +
    (item.pinned ? 0.20 : 0) +
    (item.locked ? 0.10 : 0)
  );
}

async function directMemoryFallback(input: {
  supabase: SupabaseClient;
  authedUserId: string;
  projectId: string | null;
}): Promise<RetrievedMemoryItem[]> {
  let query = input.supabase
    .from("memory_items")
    .select(
      "id, user_id, project_id, conversation_id, key, value, tier, scope, user_trigger_only, importance, confidence, locked, pinned, status, deleted_at, last_seen_at, last_reinforced_at, updated_at",
    )
    .eq("user_id", input.authedUserId)
    .is("deleted_at", null)
    .eq("status", "active")
    .order("pinned", { ascending: false })
    .order("importance", { ascending: false })
    .order("last_reinforced_at", { ascending: false })
    .limit(50);

  if (input.projectId) {
    query = query.or(
      `project_id.eq.${input.projectId},scope.eq.global`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? [])
    .filter(isLiveRow)
    .map(normalizeRow)
    .filter((item: RetrievedMemoryItem) =>
      isMemoryInProjectScope(item, input.projectId),
    );
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
    projectId = null,
    latestUserText,
    useVectorSearch = false,
  } = params;

  // Retrieval caching stays disabled until mutation invalidation is proven.
  void params.useCache;

  let items: RetrievedMemoryItem[] = [];

  if (
    useVectorSearch &&
    projectId &&
    latestUserText.trim().length >= 3
  ) {
    try {
      const queryEmbedding =
        await openAIEmbed(latestUserText.trim());

      const { data, error } =
        await supabase.rpc(
          "match_memories_v3",
          {
            p_user_id: authedUserId,
            p_project_id: projectId,
            p_query_embedding: queryEmbedding,
            p_match_count: 40,
          },
        );

      if (error) throw error;

      items = (data ?? [])
        .filter(isLiveRow)
        .map(normalizeRow)
        .filter((item: RetrievedMemoryItem) =>
          isMemoryInProjectScope(item, projectId),
        )
        .sort(
          (a, b) =>
            memoryStabilityScore(b) -
            memoryStabilityScore(a),
        )
        .slice(0, 30);
    } catch (error) {
      console.warn(
        "[memory:retrieval] vector fallback",
        error,
      );

      items = await directMemoryFallback({
        supabase,
        authedUserId,
        projectId,
      });
    }
  } else {
    items = await directMemoryFallback({
      supabase,
      authedUserId,
      projectId,
    });
  }

  const result: MemoryContextResult = {
    core: items.filter((i) => i.tier === "core" || i.pinned),
    normal: items.filter(
      (i) =>
        i.tier === "normal" &&
        !i.user_trigger_only &&
        !i.pinned,
    ),
    sensitive: items.filter(
      (i) =>
        i.tier === "sensitive" ||
        i.user_trigger_only,
    ),
    keysUsed: items
      .map((i) => i.key)
      .filter(Boolean),
  };

  return result;
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type RetrievedMemoryItem = {
  id: string;
  project_id: string | null;
  conversation_id: string | null;
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
  mention_count: number;
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

const QUERY_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "but",
  "can",
  "did",
  "do",
  "does",
  "for",
  "from",
  "had",
  "has",
  "have",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "you",
  "your",
]);

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
    mention_count: Number(row.mention_count ?? 0),
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

export function isMemoryInConversationScope(
  item: Pick<RetrievedMemoryItem, "conversation_id" | "scope">,
  conversationId: string | null,
) {
  if (item.scope !== "conversation") return true;

  // Historical conversation-scoped rows were persisted before conversation_id
  // was wired through the memory pipeline. Keep those rows usable as legacy
  // longitudinal memory instead of silently making existing memory disappear.
  if (!item.conversation_id) return true;

  return Boolean(conversationId) && item.conversation_id === conversationId;
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      value
        .normalize("NFKC")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length >= 2 &&
            !QUERY_STOP_WORDS.has(token),
        ),
    ),
  );
}

function lexicalRelevance(item: RetrievedMemoryItem, latestUserText: string) {
  const queryTokens = tokenize(latestUserText);
  if (!queryTokens.length) return 0;

  const keyTokens = new Set(tokenize(item.key.replace(/[._-]+/g, " ")));
  const contentTokens = new Set(tokenize(item.content_text));
  let score = 0;

  for (const token of queryTokens) {
    if (keyTokens.has(token)) score += 3;
    if (contentTokens.has(token)) score += 1;
  }

  const normalizedQuery = latestUserText.trim().toLowerCase();
  const normalizedContent = item.content_text.trim().toLowerCase();
  if (
    normalizedQuery.length >= 8 &&
    normalizedContent.includes(normalizedQuery)
  ) {
    score += 4;
  }

  return score / Math.max(1, queryTokens.length);
}

function timestamp(value: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function rankForCurrentTurn(
  items: RetrievedMemoryItem[],
  latestUserText: string,
) {
  return items
    .map((item) => ({
      ...item,
      similarity: lexicalRelevance(item, latestUserText),
    }))
    .sort((left, right) => {
      const leftCore = left.pinned || left.locked || left.tier === "core" ? 1 : 0;
      const rightCore = right.pinned || right.locked || right.tier === "core" ? 1 : 0;
      if (leftCore !== rightCore) return rightCore - leftCore;

      const relevanceDelta = Number(right.similarity ?? 0) - Number(left.similarity ?? 0);
      if (relevanceDelta !== 0) return relevanceDelta;

      if (left.importance !== right.importance) {
        return right.importance - left.importance;
      }
      if (left.confidence !== right.confidence) {
        return right.confidence - left.confidence;
      }
      if (left.mention_count !== right.mention_count) {
        return right.mention_count - left.mention_count;
      }

      return (
        timestamp(right.last_reinforced_at ?? right.updated_at) -
        timestamp(left.last_reinforced_at ?? left.updated_at)
      );
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
    projectId,
    conversationId,
    latestUserText,
    useVectorSearch = false,
  } = params;

  // Compatibility input only. Retrieval caching is disabled until correction,
  // upsert, deletion, and cross-instance invalidation are all proven safe.
  void params.useCache;
  // The live match_memory_items RPC accepts a user ID but neither accepts a
  // project ID nor returns project_id. Until that contract is corrected under
  // an approved migration, vector results cannot be safely project-filtered.
  // Query-aware lexical ranking below restores long-tail recall without
  // weakening project isolation.
  void useVectorSearch;

  let q = supabase
    .from("memory_items")
    .select(
      "id, user_id, project_id, conversation_id, key, value, tier, scope, user_trigger_only, importance, confidence, locked, pinned, status, deleted_at, mention_count, last_seen_at, last_reinforced_at, updated_at"
    )
    .eq("user_id", authedUserId)
    .is("deleted_at", null)
    .eq("status", "active")
    .order("pinned", { ascending: false })
    .order("importance", { ascending: false })
    .order("last_reinforced_at", { ascending: false })
    .limit(500);

  if (projectId) {
    q = q.or(`project_id.eq.${projectId},scope.eq.global`);
  }

  const { data, error } = await q;
  if (error) throw error;

  const scoped = (data ?? [])
    .filter(isLiveRow)
    .map(normalizeRow)
    .filter((item) => isMemoryInProjectScope(item, projectId ?? null))
    .filter((item) =>
      isMemoryInConversationScope(item, conversationId ?? null),
    );

  // Keep prompt size bounded, but choose the bound *after* turn-aware ranking.
  // Previously the database's top 50 newest/strongest rows were all we could
  // see, which made older-but-relevant longitudinal memory effectively vanish.
  const items = rankForCurrentTurn(scoped, latestUserText).slice(0, 50);

  const result: MemoryContextResult = {
    core: items.filter((i) => i.tier === "core" || i.pinned),
    normal: items.filter((i) => i.tier === "normal" && !i.user_trigger_only && !i.pinned),
    sensitive: items.filter((i) => i.tier === "sensitive" || i.user_trigger_only),
    keysUsed: items.map((i) => i.key).filter(Boolean),
  };

  return result;
}

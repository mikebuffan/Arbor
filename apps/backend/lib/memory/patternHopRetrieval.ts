import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/memory/embeddings";
import type { PatternHopEvidence } from "@/lib/memory/patternHop";

export type HistoricalHopResult = {
  id: string;
  source: string;
  sourceThreadId: string;
  sourceMessageId: string;
  sourceMessageIndex: number | null;
  role: "user" | "assistant" | "system";
  content: string;
  occurredAt: string | null;
  similarity: number;
  retrievalMethod?: "historical_embedding" | "historical_lexical";
};

function normalizedTerms(text: string): string[] {
  const stop = new Set([
    "the", "and", "that", "this", "with", "from", "have", "were",
    "what", "when", "where", "into", "about", "your", "you", "but",
    "not", "for", "are", "was", "then", "they", "will", "would",
  ]);
  return Array.from(
    new Set(
      (text.toLowerCase().match(/[a-z0-9_-]{3,}/g) ?? [])
        .filter((term) => !stop.has(term)),
    ),
  ).slice(0, 12);
}

function lexicalScore(query: string, candidate: string): number {
  const q = normalizedTerms(query);
  if (!q.length) return 0;
  const haystack = candidate.toLowerCase();
  let matched = 0;
  for (const term of q) {
    if (haystack.includes(term)) matched += 1;
  }
  return matched / q.length;
}

function looksLikeAssistantSelfDescription(content: string): boolean {
  return /\bI\s+(?:remember|changed|learned|became|am|was|can|cannot|can't|have|had|persisted|updated)\b/i.test(
    content,
  );
}

type HistoricalArchiveRow = {
  id: string; source: string; source_thread_id: string; source_message_id: string;
  source_message_index: number | null; role: HistoricalHopResult["role"];
  content: string; occurred_at: string | null;
};
// The historical embedding RPC does not return scope columns. Always promote
// evidence from independently read, owner/project-scoped canonical rows, not
// RPC-provided excerpts or a client's claimed source identity.
function scopedHistoricalRow(
  value: unknown, owner: string, project: string,
): HistoricalArchiveRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.user_id !== owner || row.project_id !== project ||
      typeof row.id !== "string" || !row.id ||
      typeof row.source !== "string" || !row.source ||
      typeof row.source_thread_id !== "string" || !row.source_thread_id ||
      typeof row.source_message_id !== "string" || !row.source_message_id ||
      (row.source_message_index !== null &&
       (!Number.isInteger(row.source_message_index) ||
        (row.source_message_index as number) < 0)) ||
      !["user", "assistant", "system"].includes(String(row.role)) ||
      typeof row.content !== "string" || !row.content ||
      (row.occurred_at !== null && typeof row.occurred_at !== "string"))
    return null;
  return {
    id: row.id, source: row.source, source_thread_id: row.source_thread_id,
    source_message_id: row.source_message_id,
    source_message_index: row.source_message_index as number | null,
    role: row.role as HistoricalHopResult["role"],
    content: row.content, occurred_at: row.occurred_at as string | null,
  };
}
const historicalFields =
  "id,user_id,project_id,source,source_thread_id,source_message_id,source_message_index,role,content,occurred_at";
function historicalResult(row: HistoricalArchiveRow, similarity: number,
  method: HistoricalHopResult["retrievalMethod"]): HistoricalHopResult {
  return {
    id: row.id, source: row.source, sourceThreadId: row.source_thread_id,
    sourceMessageId: row.source_message_id,
    sourceMessageIndex: row.source_message_index, role: row.role,
    content: row.content, occurredAt: row.occurred_at,
    similarity, retrievalMethod: method,
  };
}

export async function searchHistoricalHopEvidence(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  clue: string;
  limit?: number;
}): Promise<HistoricalHopResult[]> {
  const limit = Math.max(1, Math.min(params.limit ?? 12, 50));
  const byId = new Map<string, HistoricalHopResult>();

  try {
    const embedding = await embedText(params.clue);
    const { data, error } = await params.supabase.rpc(
      "match_historical_conversation_turns",
      {
        p_user_id: params.userId,
        p_project_id: params.projectId,
        p_query_embedding: embedding,
        p_match_count: limit,
      },
    );

    if (error) throw error;

    if (!Array.isArray(data)) throw new Error("historical_semantic_rows_invalid");
    // Query only returned IDs; the joined canonical row supplies all excerpt
    // text and provenance after a second owner/project validation.
    const similarities = new Map<string, number>();
    for (const row of data) {
      if (!row || typeof row.id !== "string" || !row.id) continue;
      const similarity = Number(row.similarity ?? 0);
      if (!Number.isFinite(similarity)) continue;
      similarities.set(row.id, Math.max(similarity, similarities.get(row.id) ?? -Infinity));
    }
    if (similarities.size) {
      const { data: verified, error: verifyError } = await params.supabase
        .from("historical_conversation_turns")
        .select(historicalFields)
        .eq("user_id", params.userId)
        .eq("project_id", params.projectId)
        .in("id", [...similarities.keys()]);
      if (verifyError) throw verifyError;
      if (!Array.isArray(verified)) throw new Error("historical_semantic_verification_invalid");
      for (const record of verified) {
        const row = scopedHistoricalRow(record, params.userId, params.projectId);
        if (!row || !similarities.has(row.id)) continue;
        const result = historicalResult(row, similarities.get(row.id)!, "historical_embedding");
        byId.set(result.id, result);
      }
    }
  } catch {
    // A DB/auth failure must never log private source text or driver messages.
    console.warn("[pattern-hop] historical semantic retrieval degraded");
  }

  const terms = normalizedTerms(params.clue).slice(0, 6);
  if (terms.length) {
    const orClause = terms
      .map((term) => `content.ilike.%${term.replace(/[%_,]/g, "")}%`)
      .join(",");

    const { data, error } = await params.supabase
      .from("historical_conversation_turns")
      .select(historicalFields)
      .eq("user_id", params.userId)
      .eq("project_id", params.projectId)
      .or(orClause)
      .order("occurred_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (!error) {
      for (const record of Array.isArray(data) ? data : []) {
        const row = scopedHistoricalRow(record, params.userId, params.projectId);
        if (!row) continue;
        const result = historicalResult(
          row, lexicalScore(params.clue, row.content), "historical_lexical",
        );
        const existing = byId.get(result.id);
        if (!existing || result.similarity > existing.similarity) {
          byId.set(result.id, result);
        }
      }
    } else if (!byId.size) {
      throw error;
    }
  }

  return [...byId.values()]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export function classifyHistoricalEvidence(
  role: "user" | "assistant" | "system",
  retrospective = false,
  content = "",
) {
  if (retrospective) {
    return {
      evidenceType: "retrospective_statement",
      epistemicStatus: "retrospective" as const,
    };
  }

  if (role === "user") {
    return {
      evidenceType: "direct_user_statement",
      epistemicStatus: "direct" as const,
    };
  }

  if (role === "assistant") {
    if (looksLikeAssistantSelfDescription(content)) {
      return {
        evidenceType: "assistant_self_description",
        epistemicStatus: "hypothesis" as const,
      };
    }

    return {
      evidenceType: "direct_assistant_behavior",
      epistemicStatus: "direct" as const,
    };
  }

  return {
    evidenceType: "system_context",
    epistemicStatus: "direct" as const,
  };
}

export async function searchMemoryHopEvidence(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  clue: string;
  limit?: number;
}): Promise<PatternHopEvidence[]> {
  const { data, error } = await params.supabase
    .from("memory_items")
    .select(
      "id,user_id,project_id,conversation_id,key,value,tier,scope,confidence,memory_kind,updated_at,created_at,user_trigger_only,status,deleted_at,excluded_from_memory",
    )
    .eq("user_id", params.userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .eq("user_trigger_only", false)
    .eq("excluded_from_memory", false)
    .neq("tier", "sensitive")
    .or(`scope.eq.global,and(scope.eq.project,project_id.eq.${params.projectId})`)
    .order("updated_at", { ascending: false })
    .limit(160);

  if (error) throw error;

  // Independent returned-row eligibility: an admin/stale result must never
  // silently bypass memory's owner, project, reveal or retirement filters.
  const safeRows = Array.isArray(data) ? data : [];
  return safeRows
    .filter((row: any) => row && typeof row.id === "string" &&
      row.user_id === params.userId &&
      row.status === "active" && row.deleted_at === null &&
      row.user_trigger_only === false &&
      row.excluded_from_memory === false && row.tier !== "sensitive" &&
      ((row.scope === "global" && row.conversation_id === null) ||
       (row.scope === "project" && row.project_id === params.projectId)))
    .map((row: any) => {
      const content =
        String(row.key ?? "") +
        " " +
        (typeof row.value === "string"
          ? row.value
          : JSON.stringify(row.value ?? {}));
      const score = lexicalScore(params.clue, content);
      return {
        id: "memory:" + String(row.id),
        source: "memory",
        sourceThreadId: row.conversation_id
          ? String(row.conversation_id)
          : null,
        sourceMessageId: null,
        sourceArtifactId: String(row.id),
        speaker: null,
        evidenceType: row.memory_kind
          ? "memory_" + String(row.memory_kind)
          : "memory_item",
        content,
        occurredAt: row.updated_at ?? row.created_at ?? null,
        confidence: Math.max(
          0,
          Math.min(
            1,
            score * 0.65 + Number(row.confidence ?? 0.5) * 0.35,
          ),
        ),
        epistemicStatus: "derived" as const,
        _lexicalScore: score,
      };
    })
    .filter((row: any) => row._lexicalScore >= 0.25)
    .sort((a: any, b: any) => b.confidence - a.confidence)
    .slice(0, Math.max(1, Math.min(params.limit ?? 8, 30)))
    .map(({ _lexicalScore, ...row }: any) => row);
}

export async function searchTimelineHopEvidence(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  clue: string;
  limit?: number;
}): Promise<PatternHopEvidence[]> {
  const { data, error } = await params.supabase
    .from("arbor_timeline_events")
    .select(
      "id,user_id,project_id,conversation_id,turn_id,sequence,phase,event_type,subsystem,channel,action_id,payload,created_at",
    )
    .eq("user_id", params.userId)
    .eq("project_id", params.projectId)
    .order("created_at", { ascending: false })
    .limit(160);

  if (error) throw error;

  const safeRows = Array.isArray(data) ? data : [];
  return safeRows
    .filter((row: any) => row && typeof row.id === "string" &&
      row.user_id === params.userId && row.project_id === params.projectId)
    .map((row: any) => {
      const content = [
        row.phase,
        row.event_type,
        row.subsystem,
        row.channel,
        row.action_id,
        JSON.stringify(row.payload ?? {}),
      ]
        .filter(Boolean)
        .join(" ");
      const score = lexicalScore(params.clue, content);
      return {
        id: "timeline:" + String(row.id),
        source: "arbor_timeline",
        sourceThreadId: row.conversation_id
          ? String(row.conversation_id)
          : null,
        sourceMessageId: row.turn_id ? String(row.turn_id) : null,
        sourceArtifactId: String(row.id),
        speaker: "system",
        evidenceType: "timeline_event",
        content,
        occurredAt: row.created_at ?? null,
        chronologyRank:
          row.sequence == null ? null : Number(row.sequence),
        confidence: Math.max(0, Math.min(1, 0.55 + score * 0.45)),
        epistemicStatus: "direct" as const,
        _lexicalScore: score,
      };
    })
    .filter((row: any) => row._lexicalScore >= 0.25)
    .sort((a: any, b: any) => b.confidence - a.confidence)
    .slice(0, Math.max(1, Math.min(params.limit ?? 8, 30)))
    .map(({ _lexicalScore, ...row }: any) => row);
}

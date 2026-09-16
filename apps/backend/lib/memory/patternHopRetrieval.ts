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

export async function searchHistoricalHopEvidence(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  clue: string;
  limit?: number;
}): Promise<HistoricalHopResult[]> {
  const embedding = await embedText(params.clue);
  const { data, error } = await params.supabase.rpc(
    "match_historical_conversation_turns",
    {
      p_user_id: params.userId,
      p_project_id: params.projectId,
      p_query_embedding: embedding,
      p_match_count: Math.max(1, Math.min(params.limit ?? 12, 50)),
    },
  );

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    source: String(row.source),
    sourceThreadId: String(row.source_thread_id),
    sourceMessageId: String(row.source_message_id),
    sourceMessageIndex:
      row.source_message_index == null
        ? null
        : Number(row.source_message_index),
    role: row.role,
    content: String(row.content),
    occurredAt: row.occurred_at ?? null,
    similarity: Number(row.similarity ?? 0),
  }));
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
      "id,conversation_id,key,value,tier,scope,confidence,memory_kind,updated_at,created_at,user_trigger_only,status,deleted_at",
    )
    .eq("user_id", params.userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .eq("user_trigger_only", false)
    .neq("tier", "sensitive")
    .or(`scope.eq.global,and(scope.eq.project,project_id.eq.${params.projectId})`)
    .order("updated_at", { ascending: false })
    .limit(160);

  if (error) throw error;

  return (data ?? [])
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
      "id,conversation_id,turn_id,sequence,phase,event_type,subsystem,channel,action_id,payload,created_at",
    )
    .eq("user_id", params.userId)
    .eq("project_id", params.projectId)
    .order("created_at", { ascending: false })
    .limit(160);

  if (error) throw error;

  return (data ?? [])
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

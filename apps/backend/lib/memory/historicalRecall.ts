import type { SupabaseClient } from "@supabase/supabase-js";
import { openAIEmbed } from "@/lib/providers/openai";

export type HistoricalRecallTurn = {
  id: string;
  source: string;
  source_thread_id: string;
  source_message_id: string;
  source_message_index: number | null;
  role: "user" | "assistant" | "system";
  content: string;
  occurred_at: string | null;
  similarity?: number;
};

function significantTerms(text: string): string[] {
  const stop = new Set([
    "about","after","again","because","could","from","have","into",
    "just","like","more","that","then","there","these","they","this",
    "what","when","where","which","with","would","your"
  ]);

  return Array.from(
    new Set(
      (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
        .filter((term) => term.length >= 4 && !stop.has(term)),
    ),
  ).slice(0, 6);
}

function dedupe(turns: HistoricalRecallTurn[]): HistoricalRecallTurn[] {
  const seen = new Set<string>();
  const out: HistoricalRecallTurn[] = [];

  for (const turn of turns) {
    if (seen.has(turn.id)) continue;
    seen.add(turn.id);
    out.push(turn);
  }

  return out;
}

async function lexicalCandidates(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  query: string;
}): Promise<HistoricalRecallTurn[]> {
  const terms = significantTerms(params.query);
  if (!terms.length) return [];

  const orClause = terms
    .map((term) => `content.ilike.%${term.replace(/[%_,]/g, "")}%`)
    .join(",");

  const { data, error } = await params.supabase
    .from("historical_conversation_turns")
    .select(
      "id,source,source_thread_id,source_message_id,source_message_index,role,content,occurred_at",
    )
    .eq("user_id", params.userId)
    .eq("project_id", params.projectId)
    .or(orClause)
    .order("occurred_at", { ascending: false, nullsFirst: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as HistoricalRecallTurn[];
}

async function semanticCandidates(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  query: string;
}): Promise<HistoricalRecallTurn[]> {
  const embedding = await openAIEmbed(params.query.trim());

  const { data, error } = await params.supabase.rpc(
    "match_historical_conversation_turns",
    {
      p_user_id: params.userId,
      p_project_id: params.projectId,
      p_query_embedding: embedding,
      p_match_count: 16,
    },
  );

  if (error) throw error;
  return (data ?? []) as HistoricalRecallTurn[];
}

async function expandAroundMatch(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  match: HistoricalRecallTurn;
  radius?: number;
}): Promise<HistoricalRecallTurn[]> {
  const index = params.match.source_message_index;
  if (index == null) return [params.match];

  const radius = params.radius ?? 2;

  const { data, error } = await params.supabase
    .from("historical_conversation_turns")
    .select(
      "id,source,source_thread_id,source_message_id,source_message_index,role,content,occurred_at",
    )
    .eq("user_id", params.userId)
    .eq("project_id", params.projectId)
    .eq("source_thread_id", params.match.source_thread_id)
    .gte("source_message_index", Math.max(0, index - radius))
    .lte("source_message_index", index + radius)
    .order("source_message_index", { ascending: true });

  if (error) throw error;
  return (data ?? []) as HistoricalRecallTurn[];
}

export async function getHistoricalConversationRecall(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string | null | undefined;
  query: string;
}): Promise<HistoricalRecallTurn[]> {
  if (!params.projectId || params.query.trim().length < 3) return [];

  let semantic: HistoricalRecallTurn[] = [];
  let lexical: HistoricalRecallTurn[] = [];

  try {
    [semantic, lexical] = await Promise.all([
      semanticCandidates({
        supabase: params.supabase,
        userId: params.userId,
        projectId: params.projectId,
        query: params.query,
      }),
      lexicalCandidates({
        supabase: params.supabase,
        userId: params.userId,
        projectId: params.projectId,
        query: params.query,
      }),
    ]);
  } catch (error) {
    console.warn("[historical-recall] candidate retrieval degraded", error);
    try {
      lexical = await lexicalCandidates({
        supabase: params.supabase,
        userId: params.userId,
        projectId: params.projectId,
        query: params.query,
      });
    } catch {
      return [];
    }
  }

  const semanticRelevant = semantic
    .filter(
      (turn) =>
        typeof turn.similarity === "number" &&
        turn.similarity >= 0.50,
    )
    .sort(
      (a, b) =>
        (b.similarity ?? 0) -
        (a.similarity ?? 0),
    );

  const ranked = dedupe([
    ...lexical,
    ...semanticRelevant,
  ]).slice(0, 4);

  const expanded: HistoricalRecallTurn[] = [];
  for (const match of ranked) {
    try {
      expanded.push(
        ...(await expandAroundMatch({
          supabase: params.supabase,
          userId: params.userId,
          projectId: params.projectId,
          match,
        })),
      );
    } catch {
      expanded.push(match);
    }
  }

  return dedupe(expanded)
    .sort((a, b) => {
      if (
        a.source_thread_id === b.source_thread_id &&
        a.source_message_index != null &&
        b.source_message_index != null
      ) {
        return a.source_message_index - b.source_message_index;
      }
      return String(a.occurred_at ?? "").localeCompare(
        String(b.occurred_at ?? ""),
      );
    })
    .slice(0, 20);
}

export function historicalRecallToPromptBlock(
  turns: HistoricalRecallTurn[],
): string {
  if (!turns.length) return "";

  return [
    "HISTORICAL CONVERSATION RECALL:",
    "These are retrieved excerpts from prior conversations. Use them only when relevant. Preserve speaker attribution and chronology; do not infer beyond the excerpts.",
    ...turns.map((turn) => {
      const stamp = turn.occurred_at ? ` @ ${turn.occurred_at}` : "";
      return `- [${turn.source_thread_id} #${turn.source_message_index ?? "?"}] ${turn.role.toUpperCase()}${stamp}: ${turn.content}`;
    }),
  ].join("\n");
}

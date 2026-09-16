import type { SupabaseClient } from "@supabase/supabase-js";
import { embedTexts } from "@/lib/memory/embeddings";

export type HistoricalTurnInput = {
  source: string;
  sourceThreadId: string;
  sourceMessageId: string;
  sourceMessageIndex: number;
  role: "user" | "assistant" | "system";
  content: string;
  occurredAt: string | null;
};

export type HistoricalIngestOptions = {
  /** Skip embeddings during bulk transport. Lexical recall works immediately; vectors can be backfilled later. */
  embed?: boolean;
};

const UPSERT_BATCH = 200;

export async function upsertHistoricalConversationTurns(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  turns: HistoricalTurnInput[];
  options?: HistoricalIngestOptions;
}) {
  const usable = params.turns
    .map((turn) => ({
      ...turn,
      content: turn.content.trim(),
    }))
    .filter((turn) => turn.content.length > 0);

  if (!usable.length) return { inserted: 0 };

  const shouldEmbed = params.options?.embed !== false;
  const embeddings = shouldEmbed
    ? await embedTexts(
        usable.map((turn) =>
          [
            `role:${turn.role}`,
            turn.occurredAt ? `time:${turn.occurredAt}` : "",
            turn.content,
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      )
    : usable.map(() => null);

  const rows = usable.map((turn, index) => ({
    user_id: params.userId,
    project_id: params.projectId,
    source: turn.source,
    source_thread_id: turn.sourceThreadId,
    source_message_id: turn.sourceMessageId,
    source_message_index: turn.sourceMessageIndex,
    role: turn.role,
    content: turn.content,
    occurred_at: turn.occurredAt,
    embedding: embeddings[index],
    updated_at: new Date().toISOString(),
  }));

  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const { error } = await params.supabase
      .from("historical_conversation_turns")
      .upsert(rows.slice(i, i + UPSERT_BATCH), {
        onConflict:
          "user_id,project_id,source,source_thread_id,source_message_id",
      });

    if (error) throw error;
  }

  return { inserted: rows.length };
}

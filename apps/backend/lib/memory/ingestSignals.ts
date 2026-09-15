import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  detectTopic,
  estimateTokenCount,
  extractPhrases,
} from "./topicSignals";

export async function ingestMemorySignals(params: {
  projectId: string;
  userId: string;
  threadId: string;
  messageId: string;
  text: string;
}) {
  const admin = supabaseAdmin();
  const topic = detectTopic(params.text);
  const tokenCount = estimateTokenCount(params.text);
  const { ngrams, entities } = extractPhrases(params.text);

  // Topic segmentation already exists in the current schema. Avoid duplicate
  // signal writes on idempotent turn replays.
  const { data: existingTopic, error: existingTopicError } = await admin
    .from("ar_topic_segments")
    .select("id")
    .eq("user_id", params.userId)
    .eq("project_id", params.projectId)
    .eq("message_id", params.messageId)
    .limit(1)
    .maybeSingle();

  if (existingTopicError) throw existingTopicError;

  if (!existingTopic) {
    const { error } = await admin
      .from("ar_topic_segments")
      .insert({
        user_id: params.userId,
        project_id: params.projectId,
        thread_id: params.threadId,
        message_id: params.messageId,
        topic,
        token_count: Math.max(0, tokenCount),
      });

    if (error) throw error;
  }

  const phraseRows = [
    ...ngrams.map((phrase) => ({
      user_id: params.userId,
      project_id: params.projectId,
      thread_id: params.threadId,
      message_id: params.messageId,
      phrase,
      phrase_type: "ngram",
      count_delta: 1,
    })),
    ...entities.map((phrase) => ({
      user_id: params.userId,
      project_id: params.projectId,
      thread_id: params.threadId,
      message_id: params.messageId,
      phrase,
      phrase_type: "entity",
      count_delta: 1,
    })),
  ];

  if (phraseRows.length) {
    const { error } = await admin
      .from("ar_phrase_counts")
      .upsert(phraseRows, {
        onConflict: "user_id,message_id,phrase,phrase_type",
        ignoreDuplicates: true,
      });

    if (error) throw error;
  }

  return {
    topic,
    tokenCount,
    ngramsCount: ngrams.length,
    entitiesCount: entities.length,
  };
}

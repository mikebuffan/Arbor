import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

type Candidate = {
  category:
    | "identity"
    | "rule"
    | "preference"
    | "relationship"
    | "project"
    | "episodic"
    | "cue";
  mem_key: string;
  content: string;
  score: number;
  confidence: number;
  confirm_count: number;
  source_topics?: string[];
  source_phrases?: string[];
  source_message_ids?: string[];
  observed_threads?: string[];
  last_observed_at: string;
};

async function getTopTopics(input: {
  projectId: string;
  userId: string;
  threadId: string;
}) {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("ar_topic_segments")
    .select("topic,token_count")
    .eq("project_id", input.projectId)
    .eq("user_id", input.userId)
    .eq("thread_id", input.threadId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const totals = new Map<string, number>();
  let grand = 0;

  for (const row of data ?? []) {
    const topic = String(row.topic ?? "general");
    const tokens = Math.max(0, Number(row.token_count ?? 0));
    totals.set(topic, (totals.get(topic) ?? 0) + tokens);
    grand += tokens;
  }

  return Array.from(totals.entries())
    .map(([topic, tokens]) => ({
      topic,
      tokens,
      share: grand > 0 ? tokens / grand : 0,
    }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 8);
}

async function getTopPhrases(input: {
  projectId: string;
  userId: string;
  days: number;
  phraseType: "entity" | "ngram";
}) {
  const admin = supabaseAdmin();
  const since = new Date(
    Date.now() - input.days * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await admin
    .from("ar_phrase_counts")
    .select("phrase,count_delta,thread_id,message_id")
    .eq("project_id", input.projectId)
    .eq("user_id", input.userId)
    .eq("phrase_type", input.phraseType)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw error;

  const totals = new Map<
    string,
    {
      count: number;
      threads: Set<string>;
      messages: Set<string>;
    }
  >();

  for (const row of data ?? []) {
    const phrase = String(row.phrase ?? "").trim();
    if (!phrase) continue;

    const current =
      totals.get(phrase) ??
      {
        count: 0,
        threads: new Set<string>(),
        messages: new Set<string>(),
      };

    current.count += Math.max(0, Number(row.count_delta ?? 0));

    if (row.thread_id) current.threads.add(String(row.thread_id));
    if (row.message_id) current.messages.add(String(row.message_id));

    totals.set(phrase, current);
  }

  return Array.from(totals.entries())
    .map(([phrase, stats]) => ({
      phrase,
      count: stats.count,
      threads: Array.from(stats.threads),
      messageIds: Array.from(stats.messages),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 60);
}

function stableKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
}

function buildCandidates(input: {
  topics: Array<{ topic: string; tokens: number; share: number }>;
  entities: Array<{
    phrase: string;
    count: number;
    threads: string[];
    messageIds: string[];
  }>;
  phrases: Array<{
    phrase: string;
    count: number;
    threads: string[];
    messageIds: string[];
  }>;
  threadId: string;
  now: string;
}): Candidate[] {
  const candidates: Candidate[] = [];

  // Recovered v1: repeated project focus becomes a candidate, not immediate
  // truth. Require meaningful share before proposing it.
  const arbor = input.topics.find((item) => item.topic === "arbor_app");
  if (arbor && arbor.share > 0.18) {
    candidates.push({
      category: "project",
      mem_key: "project:arbor_app_focus",
      content:
        "Recurring project focus: Arbor/Firefly memory, continuity, reliability, and implementation.",
      score: Math.min(1, 0.7 + arbor.share),
      confidence: 0.45,
      confirm_count: 0,
      source_topics: ["arbor_app"],
      observed_threads: [input.threadId],
      last_observed_at: input.now,
    });
  }

  // Recovered "sticky nouns": only propose an entity after recurrence.
  for (const entity of input.entities) {
    if (entity.count < 3) continue;

    candidates.push({
      category: "relationship",
      mem_key: `entity:${stableKey(entity.phrase)}`,
      content: `Frequently referenced entity: ${entity.phrase}.`,
      score: Math.min(1, 0.3 + entity.count / 12),
      confidence: Math.min(0.75, 0.35 + entity.count * 0.04),
      confirm_count: 0,
      source_phrases: [entity.phrase],
      source_message_ids: entity.messageIds.slice(-20),
      observed_threads: entity.threads,
      last_observed_at: input.now,
    });
  }

  // Recovered repetition signal. Keep these as provisional cues only; a phrase
  // is NOT promoted to canonical memory merely because it repeats.
  for (const phrase of input.phrases) {
    if (phrase.count < 3 || phrase.threads.length < 2) continue;
    if (phrase.phrase.length < 5 || phrase.phrase.length > 96) continue;

    candidates.push({
      category: "cue",
      mem_key: `cue:${stableKey(phrase.phrase)}`,
      content: `Recurring user phrase/cue: "${phrase.phrase}".`,
      score: Math.min(0.85, 0.35 + phrase.count / 20),
      confidence: Math.min(0.7, 0.3 + phrase.count * 0.03),
      confirm_count: 0,
      source_phrases: [phrase.phrase],
      source_message_ids: phrase.messageIds.slice(-20),
      observed_threads: phrase.threads,
      last_observed_at: input.now,
    });
  }

  return candidates.slice(0, 40);
}

function mergeCandidate(
  existing: Candidate,
  incoming: Candidate,
): Candidate {
  return {
    ...existing,
    ...incoming,
    score: Math.min(
      1,
      Math.max(existing.score ?? 0, incoming.score ?? 0) + 0.03,
    ),
    confidence: Math.min(
      0.95,
      Math.max(existing.confidence ?? 0.2, incoming.confidence ?? 0.2) +
        0.02,
    ),
    confirm_count: Math.max(
      Number(existing.confirm_count ?? 0),
      Number(incoming.confirm_count ?? 0),
    ),
    source_topics: Array.from(
      new Set([
        ...(existing.source_topics ?? []),
        ...(incoming.source_topics ?? []),
      ]),
    ),
    source_phrases: Array.from(
      new Set([
        ...(existing.source_phrases ?? []),
        ...(incoming.source_phrases ?? []),
      ]),
    ),
    source_message_ids: Array.from(
      new Set([
        ...(existing.source_message_ids ?? []),
        ...(incoming.source_message_ids ?? []),
      ]),
    ).slice(-40),
    observed_threads: Array.from(
      new Set([
        ...(existing.observed_threads ?? []),
        ...(incoming.observed_threads ?? []),
      ]),
    ),
    last_observed_at: incoming.last_observed_at,
  };
}

export async function consolidateMemoryCandidates(input: {
  projectId: string;
  userId: string;
  threadId: string;
}) {
  const admin = supabaseAdmin();
  const now = new Date().toISOString();

  const [topics, entities, phrases] = await Promise.all([
    getTopTopics(input),
    getTopPhrases({
      projectId: input.projectId,
      userId: input.userId,
      days: 180,
      phraseType: "entity",
    }),
    getTopPhrases({
      projectId: input.projectId,
      userId: input.userId,
      days: 90,
      phraseType: "ngram",
    }),
  ]);

  const candidates = buildCandidates({
    topics,
    entities,
    phrases,
    threadId: input.threadId,
    now,
  });

  let created = 0;
  let reinforced = 0;

  for (const candidate of candidates) {
    const { data: matches, error: lookupError } = await admin
      .from("ar_memory_candidates")
      .select("id,candidate_json")
      .eq("user_id", input.userId)
      .eq("project_id", input.projectId)
      .eq("status", "proposed")
      .contains("candidate_json", {
        mem_key: candidate.mem_key,
      })
      .limit(1);

    if (lookupError) throw lookupError;

    const existing = matches?.[0];

    if (existing?.id) {
      const previous =
        (existing.candidate_json ?? {}) as Candidate;
      const merged = mergeCandidate(previous, candidate);

      const { error: updateError } = await admin
        .from("ar_memory_candidates")
        .update({
          candidate_json: merged,
          updated_at: now,
        })
        .eq("id", existing.id)
        .eq("user_id", input.userId);

      if (updateError) throw updateError;

      const { error: reinforcementError } = await admin
        .from("ar_memory_reinforcement")
        .insert({
          user_id: input.userId,
          project_id: input.projectId,
          thread_id: input.threadId,
          candidate_id: existing.id,
          decision: "observed",
          details: {
            mem_key: candidate.mem_key,
            score: candidate.score,
            confidence: candidate.confidence,
          },
        });

      if (reinforcementError) throw reinforcementError;
      reinforced += 1;
      continue;
    }

    const { error: insertError } = await admin
      .from("ar_memory_candidates")
      .insert({
        user_id: input.userId,
        project_id: input.projectId,
        thread_id: input.threadId,
        candidate_json: candidate,
        status: "proposed",
        updated_at: now,
      });

    if (insertError) throw insertError;
    created += 1;
  }

  return {
    topics,
    candidateCount: candidates.length,
    created,
    reinforced,
  };
}

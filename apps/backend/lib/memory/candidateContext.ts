import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

type CandidateJson = {
  category?: string;
  mem_key?: string;
  content?: string;
  score?: number;
  confidence?: number;
  confirm_count?: number;
  source_phrases?: string[];
  observed_threads?: string[];
  sensitive?: boolean;
};

export type ProvisionalMemoryCandidate = {
  id: string;
  json: CandidateJson;
  rank: number;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function candidateRank(json: CandidateJson): number {
  const score = Math.max(0, Math.min(1, Number(json.score ?? 0)));
  const confidence = Math.max(
    0,
    Math.min(1, Number(json.confidence ?? 0)),
  );
  const confirmations = Math.min(
    1,
    Math.max(0, Number(json.confirm_count ?? 0)) / 3,
  );
  const threadBreadth = Math.min(
    1,
    (json.observed_threads?.length ?? 0) / 3,
  );

  return (
    score * 0.45 +
    confidence * 0.30 +
    confirmations * 0.15 +
    threadBreadth * 0.10
  );
}

function cueMatches(
  json: CandidateJson,
  latestUserText: string,
): boolean {
  if (json.category !== "cue") return true;

  const user = normalize(latestUserText);
  return (json.source_phrases ?? []).some((phrase) => {
    const normalizedPhrase = normalize(phrase);
    return normalizedPhrase.length >= 3 && user.includes(normalizedPhrase);
  });
}

export async function getProvisionalMemoryCandidateContext(input: {
  userId: string;
  projectId: string;
  latestUserText: string;
  limit?: number;
}): Promise<{
  promptBlock: string;
  selected: ProvisionalMemoryCandidate[];
}> {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("ar_memory_candidates")
    .select("id,candidate_json,status,updated_at")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .eq("status", "proposed")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  const selected = (data ?? [])
    .map((row: any) => {
      const json = (row.candidate_json ?? {}) as CandidateJson;
      return {
        id: String(row.id),
        json,
        rank: candidateRank(json),
      };
    })
    .filter((candidate) => {
      const { json } = candidate;

      if (json.sensitive) return false;
      if (!json.content?.trim()) return false;
      if (!cueMatches(json, input.latestUserText)) return false;

      // Candidate injection is evidence gathering, not truth assertion.
      // Require some signal strength even before provisional use.
      return (
        candidate.rank >= 0.48 ||
        Number(json.confirm_count ?? 0) > 0
      );
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, Math.max(1, Math.min(input.limit ?? 3, 5)));

  if (!selected.length) {
    return {
      promptBlock: "",
      selected: [],
    };
  }

  const promptBlock = [
    "PROVISIONAL LEARNED SIGNALS — NOT CANONICAL FACTS.",
    "These are recurrent candidates under evaluation.",
    "They may guide attention when relevant, but do not state them as established truth unless the current conversation independently supports them.",
    "A cue candidate means the phrase recurs; it does not by itself prove what the phrase means.",
    ...selected.map((candidate) => {
      const key = candidate.json.mem_key ?? candidate.id;
      return `- [${key}] ${candidate.json.content}`;
    }),
  ].join("\n");

  return {
    promptBlock,
    selected,
  };
}

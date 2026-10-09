import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { upsertMemoryItems } from "@/lib/memory/store";
import type { MemoryItem } from "@/lib/memory/types";

type CandidateJson = {
  category?: string;
  mem_key?: string;
  content?: string;
  score?: number;
  confidence?: number;
  confirm_count?: number;
  contradiction_count?: number;
  observed_threads?: string[];
  sensitive?: boolean;
  excluded_from_memory?: boolean;
};

function canonicalMemoryKey(json: CandidateJson): string | null {
  const raw = typeof json.mem_key === "string" ? json.mem_key.trim() : "";
  if (!raw) return null;

  const suffix = raw
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 120);

  if (!suffix) return null;

  const category =
    (typeof json.category === "string" ? json.category : "pattern")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_");

  return `learned.${category}.${suffix}`;
}

function eligible(json: CandidateJson): boolean {
  if (json.sensitive || json.excluded_from_memory === true) return false;
  if (json.category === "cue") return false;
  if (typeof json.content !== "string" || !json.content.trim()) return false;

  const score = Number(json.score ?? 0);
  const confidence = Number(json.confidence ?? 0);
  const confirmations = Number(json.confirm_count ?? 0);
  const contradictions = Number(json.contradiction_count ?? 0);
  const threadBreadth = Array.isArray(json.observed_threads)
    ? new Set(json.observed_threads
      .filter((thread): thread is string => typeof thread === "string")
      .map((thread) => thread.trim()).filter(Boolean)).size
    : 0;
  if (![score, confidence, confirmations, contradictions].every(Number.isFinite)) return false;

  // A contradicted provisional hypothesis remains available for later
  // evaluation but cannot silently become durable truth. Explicit correction
  // must outrank recurrence and confidence until later evidence resolves it.
  if (contradictions > 0) return false;

  // Cross-thread recurrence is mandatory. This is the recovered
  // mentions/sessions principle: repetition in one thread is not enough.
  return (
    threadBreadth >= 2 &&
    score >= 0.75 &&
    confidence >= 0.65 &&
    (confirmations >= 1 || confidence >= 0.8)
  );
}

export async function promoteEligibleMemoryCandidates(input: {
  userId: string;
  projectId: string;
  conversationId: string;
  supabase: SupabaseClient;
}) {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("ar_memory_candidates")
    .select("id,user_id,project_id,candidate_json,status")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .eq("status", "proposed")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  const promoted: string[] = [];

  for (const row of data ?? []) {
    // Admin reads are not themselves prompt/write authorization. Recheck scope.
    if (row.user_id !== input.userId || row.project_id !== input.projectId || row.status !== "proposed") continue;
    if (!row.candidate_json || typeof row.candidate_json !== "object" || Array.isArray(row.candidate_json)) continue;
    const json = row.candidate_json as CandidateJson;
    if (!eligible(json)) continue;

    const key = canonicalMemoryKey(json);
    if (!key) continue;

    const item: MemoryItem = {
      key,
      value: {
        text: json.content,
        source: "automatic_candidate",
        candidate_id: String(row.id),
      },
      tier: "normal",
      scope: "project",
      user_trigger_only: false,
      importance: Math.max(
        6,
        Math.min(9, Math.round(Number(json.score ?? 0.75) * 10)),
      ),
      confidence: Math.max(
        0.65,
        Math.min(0.95, Number(json.confidence ?? 0.65)),
      ),
    };

    const result = await upsertMemoryItems(
      input.userId,
      [item],
      input.projectId,
      input.supabase,
      input.conversationId,
    );

    if (!result.created.includes(key) && !result.updated.includes(key)) {
      continue;
    }

    const { error: statusError } = await admin
      .from("ar_memory_candidates")
      .update({
        status: "promoted",
        candidate_json: {
          ...json,
          promoted_memory_key: key,
          promoted_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("user_id", input.userId)
      .eq("project_id", input.projectId)
      .eq("status", "proposed");

    if (statusError) throw statusError;
    promoted.push(key);
  }

  return { promoted };
}

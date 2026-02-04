import { openAIChat } from "@/lib/providers/openai";

export type ConsolidationJson = {
  episode_id: string;
  created_at: string;

  candidates: Array<{
    kind: "anchor" | "memory_item";
    key: string;
    value: string;
    confidence: number; // 0..1
    reason: string;
    scope: "project" | "user";
  }>;

  do_not_promote: Array<{
    key: string;
    reason: string;
  }>;
};

export async function consolidateEpisodeCandidates(params: {
  supabase: any;
  userId: string;
  projectId?: string;
  episodeId: string;
}) {
  const { supabase, userId, projectId, episodeId } = params;

  const { data: ep, error: epErr } = await supabase
    .from("episodes")
    .select("id,user_id,project_id,thread_id,status,summary_json,consolidation_json")
    .eq("id", episodeId)
    .single();

  if (epErr) throw epErr;
  if (!ep || ep.user_id !== userId) throw new Error("episode_not_found");

  if (ep.consolidation_json) {
    return { ok: true, episodeId, already: true, consolidation: ep.consolidation_json };
  }

  if (!ep.summary_json) {
    throw new Error("episode_missing_summary");
  }

  const system = `
You are a consolidation agent. Output ONLY valid JSON.
No markdown. No extra keys. No prose outside JSON.

You receive an episode summary JSON and must propose PROMOTION CANDIDATES only.
DO NOT write final memories. DO NOT mention private/sensitive data unless it is clearly safe and affirmed.
Prefer emotionally neutral, stable, repeatedly useful facts (names, roles, relationships, preferences) ONLY if clearly present.

Return JSON with this exact schema:
{
  "candidates": [
    {
      "kind": "anchor" | "memory_item",
      "key": string,
      "value": string,
      "confidence": number,
      "reason": string,
      "scope": "project" | "user"
    }
  ],
  "do_not_promote": [{ "key": string, "reason": string }]
}

Rules:
- candidates: 0..12
- confidence 0..1
- If uncertain, put it in do_not_promote instead.
`.trim();

  const user = `
EPISODE_ID: ${episodeId}
PROJECT_ID: ${projectId ?? ep.project_id ?? null}

EPISODE_SUMMARY_JSON:
${JSON.stringify(ep.summary_json)}
`.trim();

  const ai = await openAIChat({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-5",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const raw = (ai as any)?.choices?.[0]?.message?.content ?? "";
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("episode_consolidation_invalid_json");
  }

  const consolidation: ConsolidationJson = {
    episode_id: episodeId,
    created_at: new Date().toISOString(),
    candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
    do_not_promote: Array.isArray(parsed.do_not_promote) ? parsed.do_not_promote : [],
  };

  const { error: uErr } = await supabase
    .from("episodes")
    .update({
      consolidation_json: consolidation,
      updated_at: new Date().toISOString(),
    })
    .eq("id", episodeId)
    .is("consolidation_json", null);

  if (uErr) {
    console.error("[episodes] consolidation update failed", uErr);
  }

  return { ok: true, episodeId, already: false, consolidation };
}

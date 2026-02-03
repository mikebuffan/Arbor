import { openAIChat } from "@/lib/providers/openai";

type MsgRow = { role: "user" | "assistant"; content: string; created_at?: string };

export type EpisodeSummaryJson = {
  episode_id: string;
  thread_id: string;
  created_at: string;

  topics: string[];
  user_goals: string[];
  assistant_commitments: string[];

  stable_facts_candidates: Array<{
    key: string;
    value: string;
    confidence: number; 
    rationale: string;
  }>;

  contradictions: Array<{
    key: string;
    a: string;
    b: string;
    severity: "low" | "medium" | "high";
  }>;

  emotional_tone: {
    user: string;      
    assistant: string; 
  };

  followups: string[];
};

function clipText(s: string, max = 6000) {
  const t = String(s ?? "");
  return t.length > max ? t.slice(0, max) + "\n...[clipped]" : t;
}

function toTranscript(rows: MsgRow[]) {
  const parts: string[] = [];
  for (const r of rows) {
    parts.push(`${r.role.toUpperCase()}: ${clipText(r.content, 1200)}`);
  }
  return parts.join("\n\n");
}

export async function summarizeEpisode(params: {
  supabase: any;
  userId: string;
  projectId?: string;
  episodeId: string;
}) {
  const { supabase, userId, projectId, episodeId } = params;

  const { data: ep, error: epErr } = await supabase
    .from("episodes")
    .select("id,user_id,project_id,thread_id,status,summary_json,opened_at,closed_at,created_at")
    .eq("id", episodeId)
    .single();

  if (epErr) throw epErr;
  if (!ep || ep.user_id !== userId) throw new Error("episode_not_found");

  if (ep.status === "summarized" || ep.summary_json) {
    return { ok: true, episodeId, already: true, summary: ep.summary_json };
  }

  const { data: msgs, error: mErr } = await supabase
    .from("messages")
    .select("role,content,created_at")
    .eq("user_id", userId)
    .eq("project_id", projectId ?? ep.project_id)
    .eq("episode_id", episodeId)
    .order("created_at", { ascending: true })
    .limit(120);

  if (mErr) throw mErr;

  const transcript = toTranscript((msgs ?? []) as MsgRow[]);

  const system = `
You are a backend summarizer. Output ONLY valid JSON.
No markdown. No extra keys. No prose outside JSON.

Goal:
Summarize an "episode" of chat into a compact structured object used for internal tooling.
Do NOT include sensitive personal data beyond what appears in transcript.
Do NOT include raw quotes longer than ~12 words.

Return JSON matching this schema:

{
  "topics": string[],
  "user_goals": string[],
  "assistant_commitments": string[],
  "stable_facts_candidates": [{"key": string, "value": string, "confidence": number, "rationale": string}],
  "contradictions": [{"key": string, "a": string, "b": string, "severity": "low"|"medium"|"high"}],
  "emotional_tone": {"user": string, "assistant": string},
  "followups": string[]
}

Rules:
- topics: 3-10 items
- stable_facts_candidates: only facts that seem persistent & useful for personalization; confidence 0..1
- contradictions: include if present; else []
- followups: actionable next steps (max 8)
`.trim();

  const user = `
EPISODE_ID: ${episodeId}
THREAD_ID: ${ep.thread_id}

TRANSCRIPT:
${clipText(transcript, 12000)}
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
    throw new Error("episode_summary_invalid_json");
  }

  const summary: EpisodeSummaryJson = {
    episode_id: episodeId,
    thread_id: ep.thread_id,
    created_at: new Date().toISOString(),
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    user_goals: Array.isArray(parsed.user_goals) ? parsed.user_goals : [],
    assistant_commitments: Array.isArray(parsed.assistant_commitments) ? parsed.assistant_commitments : [],
    stable_facts_candidates: Array.isArray(parsed.stable_facts_candidates) ? parsed.stable_facts_candidates : [],
    contradictions: Array.isArray(parsed.contradictions) ? parsed.contradictions : [],
    emotional_tone: parsed.emotional_tone ?? { user: "", assistant: "" },
    followups: Array.isArray(parsed.followups) ? parsed.followups : [],
  };

  if (ep.status === "open") {
    await supabase
      .from("episodes")
      .update({ status: "closed", closed_at: ep.closed_at ?? new Date().toISOString() })
      .eq("id", episodeId);
  }

  const { error: uErr } = await supabase
    .from("episodes")
    .update({
      status: "summarized",
      summary_json: summary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", episodeId)
    .is("summary_json", null);

  if (uErr) {
    console.error("[episodes] summarize update failed", uErr);
  }
  return { ok: true, episodeId, already: false, summary };
}

import { supabaseAdmin } from "@/lib/supabase/admin";
import { openAIChat, openAIEmbed } from "@/lib/providers/openai";
import { logMemoryEvent } from "@/lib/memory/logger";

const ITEMS_TABLE = "memory_items";

function valueToText(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (typeof v.text === "string") return v.text;
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

export async function reflectOnMemoryCluster(
  userId: string,
  projectId: string | null,
  recentKeys: string[]
) {
  const client = supabaseAdmin();

  const { data: items, error } = await client
    .from(ITEMS_TABLE)
    .select("key, value")
    .in("key", recentKeys)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .eq("status", "active")
    .limit(20);

  if (error) throw error;
  if (!items?.length) return null;

  const reflectionPrompt = `
You are an AI reflection engine analyzing a user's persistent memory.
Summarize key patterns, contradictions, and emerging intents across the following memories:

${items.map((i: any) => `- ${i.key}: ${valueToText(i.value)}`).join("\n")}

Output as structured JSON:
{
  "themes": [string],
  "actions": [string],
  "contradictions": [string]
}`.trim();

  const reflectionResponse = await openAIChat({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a cognitive reflection agent." },
      { role: "user", content: reflectionPrompt },
    ],
    stream: false,
  });

  const reflectionText =
    (reflectionResponse as any)?.choices?.[0]?.message?.content?.trim?.() ??
    "(no reflection output)";

  const embedding = await openAIEmbed(reflectionText);

  const { error: insertError } = await client.from("memory_reflections").insert({
    user_id: userId,
    project_id: projectId,
    summary: reflectionText,
    embedding,
  });

  if (insertError) throw insertError;

  await logMemoryEvent("reflection_create", {
    userId,
    projectId,
    keys: recentKeys,
    length: reflectionText.length,
  });

  return { summary: reflectionText };
}

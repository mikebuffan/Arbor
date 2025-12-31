import { NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabaseServer";
import { PERSONAS } from "@/lib/persona";
import { analyzeCues } from "@/lib/cues";
import { buildNextMove } from "@/lib/flow";
import { buildSystemPrompt } from "@/lib/promptBuilder";
import { generateWithOpenAI } from "@/lib/providers/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  userId: z.string().min(1),
  conversationId: z.string().uuid(),
  userText: z.string().min(1),
});

async function ensureConversation(db: ReturnType<typeof supabaseAdmin>, userId: string, conversationId: string) {
  await db.from("conversations").upsert(
    { id: conversationId, user_id: userId },
    { onConflict: "id" }
  );
}

async function getUserProfile(db: ReturnType<typeof supabaseAdmin>, userId: string) {
  const { data } = await db.from("user_profile").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

async function getMemory(db: ReturnType<typeof supabaseAdmin>, userId: string) {
  const { data } = await db
    .from("memory_items")
    .select("*")
    .eq("user_id", userId)
    .order("weight", { ascending: false })
    .limit(12);

  const memoryFacts = (data || []).map((d: any) => `${d.kind}:${d.key}=${d.value}`);
  const redirectHook = (data || []).find((d: any) => d.kind === "redirect")?.value;
  const addressAs = (data || []).find((d: any) => d.kind === "preference" && d.key === "address_as")?.value;

  return { memoryFacts, redirectHook, addressAs };
}

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, conversationId, userText } = parsed.data;

  const db = supabaseAdmin();

  await ensureConversation(db, userId, conversationId);

  await db.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: userText,
  });

  const profile = await getUserProfile(db, userId);
  const persona = PERSONAS[(profile?.persona_variant || "arbor_masc") as keyof typeof PERSONAS];

  const cues = analyzeCues(userText);
  const memory = await getMemory(db, userId);

  const systemPrompt = buildSystemPrompt(persona, memory.memoryFacts);
  const nextMove = buildNextMove({
    persona,
    cues,
    memory: {
      addressAs: memory.addressAs || persona.addressingDefault,
      redirectHook: memory.redirectHook,
    },
  });

  let assistantText = nextMove.prompt;

  if (process.env.OPENAI_API_KEY) {
    assistantText = await generateWithOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ]);

    if (!assistantText) {
      assistantText = "I’m here. Say one sentence about what you want next.";
    }
  }

  await db.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: assistantText,
  });

  return NextResponse.json({
    cues,
    nextMoveType: nextMove.type,
    assistantText,
  });
}

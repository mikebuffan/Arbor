import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { openai } from "@/lib/providers/openai";
import { getMemoryContext } from "@/lib/memory/retrieval";
import { buildPromptContext } from "@/lib/prompt/buildPromptContext";
import { extractMemoryFromText } from "@/lib/memory/extractor";
import { upsertMemoryItems, reinforceMemoryUse } from "@/lib/memory/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant" | "system"; content: string };

// Accept nulls from the client and treat them as "unset"
const NullableUuid = z.preprocess(
  (v) => (v === null || v === "" ? undefined : v),
  z.string().uuid().optional()
);

const Body = z.object({
  projectId: NullableUuid,
  conversationId: NullableUuid,
  userText: z.string().min(1),
});

async function getOrCreateDefaultProjectId(supabase: any, userId: string): Promise<string> {
  const { data: existing, error: e1 } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Default Project")
    .maybeSingle();

  if (e1) throw e1;
  if (existing?.id) return existing.id as string;

  const { data: created, error: e2 } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: "Default Project",
      persona_id: "arbor",
      framework_version: "v1",
    })
    .select("id")
    .single();

  if (e2) throw e2;
  return created.id as string;
}

async function getOrCreateConversation(params: {
  supabase: any;
  userId: string;
  projectId: string;
  conversationId?: string;
}) {
  const { supabase, userId, projectId, conversationId } = params;

  if (conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .single();

    if (error) throw error;
    return data.id as string;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      project_id: projectId,
      title: null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function loadRecentMessages(
  supabase: any,
  userId: string,
  conversationId: string,
  limit = 30
): Promise<Msg[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role,content,created_at,deleted_at,expires_at")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((m: any) => ({ role: m.role, content: m.content }));
}

async function cleanupExpiredMessagesBestEffort(supabase: any, userId: string) {
  await supabase
    .from("messages")
    .delete()
    .eq("user_id", userId)
    .lt("expires_at", new Date().toISOString())
    .not("expires_at", "is", null);
}

export async function POST(req: Request) {
  try {
    const { supabase, userId } = await requireUser(req);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const { projectId: maybeProjectId, conversationId, userText } = parsed.data;

    await cleanupExpiredMessagesBestEffort(supabase, userId);

    // 1) Resolve project (persona/framework lives here)
    const projectId = maybeProjectId ?? (await getOrCreateDefaultProjectId(supabase, userId));

    // 2) Ensure project exists/owned
    const { data: project, error: pErr } = await supabase
      .from("projects")
      .select("id, persona_id, framework_version")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();
    if (pErr) {
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    // 3) Resolve conversation (persist this ID client-side to keep the thread)
    const convoId = await getOrCreateConversation({
      supabase,
      userId,
      projectId,
      conversationId,
    });

    // 4) Persist user msg
    {
      const { error } = await supabase.from("messages").insert({
        project_id: projectId,
        conversation_id: convoId,
        user_id: userId,
        role: "user",
        content: userText,
      });
      if (error) throw error;
    }

    const history = await loadRecentMessages(supabase, userId, convoId, 30);

    // 5) Memory context BEFORE model call
    const mem = await getMemoryContext({
      authedUserId: userId,
      projectId,
      latestUserText: userText,
    });

    const allItems = [...mem.core, ...mem.normal, ...mem.sensitive] as any[];
    const decayMs = 1000 * 60 * 60 * 24 * 30;

    const memoryBlock = buildPromptContext({
      allItems,
      userText,
      decayMs,
    });

    const systemPrompt = `
You are Arbor: friend-like, grounded, competent, and honest.
- No patronizing softness by default.
- Warmth + directness. Real guidance.
- Never mention sensitive memories unless the user explicitly references them first.
- This is the Firefly/Arbor app.

Project persona_id: ${project.persona_id}
Framework version: ${project.framework_version}

${memoryBlock}
`.trim();

    const messagesForModel: Msg[] = [{ role: "system", content: systemPrompt }, ...history];

    const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-5";
    const completion = await openai.chat.completions.create({
      model,
      messages: messagesForModel,
    });

    const assistantText = completion.choices[0]?.message?.content ?? "";

    // 6) Persist assistant msg
    {
      const { error } = await supabase.from("messages").insert({
        project_id: projectId,
        conversation_id: convoId,
        user_id: userId,
        role: "assistant",
        content: assistantText,
      });
      if (error) throw error;
    }

    // 7) Extract + store memory AFTER assistant is known
    const extracted = await extractMemoryFromText({ userText, assistantText });

    console.log("extracted items count:", extracted.length);
    console.log("extracted items:", extracted);

    await upsertMemoryItems(userId, extracted, projectId);
    await reinforceMemoryUse(userId, mem.keysUsed, projectId);

    // 8) Touch conversation updated_at
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convoId)
      .eq("user_id", userId);

    return NextResponse.json({
      ok: true,
      projectId,
      conversationId: convoId,
      assistantText,
    });
  } catch (err: any) {
    console.error("chat route error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "server_error" }, { status: 500 });
  }
}

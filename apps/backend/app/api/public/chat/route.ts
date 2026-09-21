import { NextResponse } from "next/server";
import { z } from "zod";
import { PublicAlphaError, requirePublicAlphaUser } from "@/lib/publicApp/alphaAuth";
import {
  ArborLMUnavailable,
  generateWithArborLM,
  publicModelConfig,
  type PublicModelMessage,
} from "@/lib/publicApp/arborLM";
import { publicJson, publicPreflight } from "@/lib/publicApp/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  conversationId: z.string().uuid().optional(),
  turnId: z.string().uuid(),
  userText: z.string().trim().min(1).max(4000),
  interactionMode: z.enum(["text", "voice"]).default("text"),
}).strict();

const SYSTEM = [
  "You are Arbor in the separate public Arbor App alpha, not the owner's private Grove.",
  "Never claim you have performed an action, read a file, connected ARK, or recalled",
  "information unless that action or data is present in this request's evidence.",
  "A user cannot authorize access to another person's conversations.",
  "Treat this conversation as the only supplied personal context.",
  "Be direct, caring and grounded. Admit uncertainty, respond to corrections.",
  "You are conversational software, not a licensed therapist or emergency service.",
  "If the user is in immediate danger, encourage local emergency services",
  "and a trusted nearby person; do not promise active monitoring.",
].join(" ");

type StoredMessage = {
  conversation_id: string;
  user_id: string;
  turn_id: string;
  role: "user" | "assistant";
  content: string;
};

export async function OPTIONS(req: Request) {
  return publicPreflight(req);
}

export async function POST(req: Request) {
  try {
    const { userId, db } = await requirePublicAlphaUser(req);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return publicJson(req, { ok: false, error: "invalid_chat_input" }, 400);
    }
    const { conversationId, turnId, userText } = parsed.data;
    // Verify model infrastructure before writing a new conversation.
    const model = publicModelConfig();

    // Idempotency is tied to an authenticated user, NEVER a phone-supplied user ID.
    const { data: existing, error: existingError } = await db
      .from("public_app_messages")
      .select("conversation_id,user_id,turn_id,role,content")
      .eq("user_id", userId)
      .eq("turn_id", turnId);
    if (existingError) throw existingError;
    const old = (existing ?? []) as StoredMessage[];
    const oldUser = old.find((message) => message.role === "user");
    const oldAssistant = old.find((message) => message.role === "assistant");
    if (
      (oldUser && oldUser.content !== userText) ||
      (oldUser && conversationId && oldUser.conversation_id !== conversationId)
    ) {
      return publicJson(req, { ok: false, error: "turn_conflict" }, 409);
    }
    if (oldAssistant && oldUser) {
      return publicJson(req, {
        ok: true,
        conversationId: oldUser.conversation_id,
        assistantText: oldAssistant.content,
        model: model.model,
      });
    }
    if (oldAssistant && !oldUser) {
      throw new PublicAlphaError("turn_state_conflict", 409);
    }

    const since = new Date(Date.now() - 86_400_000).toISOString();
    if (!oldUser) {
      const { count, error: usageError } = await db
        .from("public_app_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("role", "user")
        .gte("created_at", since);
      if (usageError) throw usageError;
      if ((count ?? 0) >= 60) {
        return publicJson(req, { ok: false, error: "daily_alpha_limit" }, 429);
      }
    }

    let id = oldUser?.conversation_id ?? conversationId;
    if (id) {
      const { data, error } = await db
        .from("public_app_conversations")
        .select("id")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return publicJson(req, { ok: false, error: "conversation_not_found" }, 404);
      }
    } else {
      const { data, error } = await db
        .from("public_app_conversations")
        .insert({
          user_id: userId,
          title: userText.slice(0, 72).replace(/\s+/g, " "),
        })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Conversation creation failed");
      id = data.id as string;
    }

    if (!oldUser) {
      const { error } = await db.from("public_app_messages").insert({
        user_id: userId,
        conversation_id: id,
        turn_id: turnId,
        role: "user",
        content: userText,
      });
      if (error) {
        // Competing requests cannot produce duplicate turns because the database
        // enforces UNIQUE (user_id, turn_id, role).
        return publicJson(req, { ok: false, error: "turn_conflict" }, 409);
      }
    }

    const { data: history, error: historyError } = await db
      .from("public_app_messages")
      .select("role,content")
      .eq("user_id", userId)
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(21);
    if (historyError) throw historyError;

    const messages: PublicModelMessage[] = [
      { role: "system", content: SYSTEM },
      ...((history ?? []) as PublicModelMessage[]).reverse().map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
    ];
    const assistantText = await generateWithArborLM(messages, model);
    const { error: saveError } = await db.from("public_app_messages").insert({
      user_id: userId,
      conversation_id: id,
      turn_id: turnId,
      role: "assistant",
      content: assistantText,
    });
    if (saveError) {
      return publicJson(req, { ok: false, error: "turn_conflict" }, 409);
    }
    const { error: touchError } = await db
      .from("public_app_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (touchError) {
      // Reply was durably saved. Do not claim that it was lost or re-generate it.
      console.warn("[public-app] conversation timestamp update failed");
    }
    return publicJson(req, {
      ok: true,
      conversationId: id,
      assistantText,
      model: model.model,
    });
  } catch (error) {
    if (error instanceof ArborLMUnavailable) {
      return publicJson(req, { ok: false, error: error.code }, error.httpStatus);
    }
    if (error instanceof PublicAlphaError) {
      return publicJson(req, { ok: false, error: error.code }, error.status);
    }
    console.error("[public-app] request failed (details withheld)");
    return publicJson(req, { ok: false, error: "public_app_unavailable" }, 503);
  }
}

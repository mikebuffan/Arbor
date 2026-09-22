import { z } from "zod";
import { requirePublicAlphaUser, PublicAlphaError } from "@/lib/publicApp/alphaAuth";
import { publicJson, publicPreflight } from "@/lib/publicApp/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function OPTIONS(req: Request) {
  return publicPreflight(req);
}

export async function GET(req: Request, context: Context) {
  try {
    const { userId, db } = await requirePublicAlphaUser(req);
    const candidate = z.string().uuid().safeParse((await context.params).id);
    if (!candidate.success) {
      return publicJson(req, { ok: false, error: "invalid_conversation_id" }, 400);
    }
    const { data: conversation, error } = await db
      .from("public_app_conversations")
      .select("id,title,created_at,updated_at")
      .eq("id", candidate.data)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!conversation) {
      return publicJson(req, { ok: false, error: "conversation_not_found" }, 404);
    }
    // Read the newest page first so reopening a long conversation always
    // recovers its latest unanswered turn. Fetch one extra row for hasMore.
    const rawOffset = new URL(req.url).searchParams.get("offset") ?? "0";
    if (!/^(0|[1-9][0-9]{0,4})$/.test(rawOffset) ||
        Number(rawOffset) > 10000) {
      return publicJson(req, { ok: false, error: "invalid_history_offset" }, 400);
    }
    const offset = Number(rawOffset);
    const { data: messages, error: messageError } = await db
      .from("public_app_messages")
      .select("id,turn_id,role,content,created_at")
      .eq("user_id", userId)
      .eq("conversation_id", candidate.data)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 100);
    if (messageError) throw messageError;
    const page = messages ?? [];
    const hasMore = page.length > 100 && offset + 100 <= 10000;
    return publicJson(req, {
      ok: true,
      conversation,
      messages: page.slice(0, 100).reverse(),
      hasMore,
      nextOffset: hasMore ? offset + 100 : null,
    });
  } catch (error) {
    if (error instanceof PublicAlphaError) {
      return publicJson(req, { ok: false, error: error.code }, error.status);
    }
    console.error("[public-app] conversation retrieval failed (details withheld)");
    return publicJson(req, { ok: false, error: "public_app_unavailable" }, 503);
  }
}

export async function DELETE(req: Request, context: Context) {
  try {
    const { userId, db } = await requirePublicAlphaUser(req);
    const candidate = z.string().uuid().safeParse((await context.params).id);
    if (!candidate.success) {
      return publicJson(req, { ok: false, error: "invalid_conversation_id" }, 400);
    }
    // Do not delete without first establishing ownership. Child turns cascade.
    const { data, error: findError } = await db
      .from("public_app_conversations")
      .select("id")
      .eq("id", candidate.data)
      .eq("user_id", userId)
      .maybeSingle();
    if (findError) throw findError;
    if (!data) return publicJson(req, { ok: false, error: "conversation_not_found" }, 404);
    const { error } = await db
      .from("public_app_conversations")
      .delete()
      .eq("id", candidate.data)
      .eq("user_id", userId);
    if (error) throw error;
    return publicJson(req, { ok: true, deleted: true });
  } catch (error) {
    if (error instanceof PublicAlphaError) {
      return publicJson(req, { ok: false, error: error.code }, error.status);
    }
    console.error("[public-app] conversation deletion failed (details withheld)");
    return publicJson(req, { ok: false, error: "public_app_unavailable" }, 503);
  }
}

import { requirePublicAlphaUser, PublicAlphaError } from "@/lib/publicApp/alphaAuth";
import { publicJson, publicPreflight } from "@/lib/publicApp/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request) {
  return publicPreflight(req);
}

export async function GET(req: Request) {
  try {
    const { userId, db } = await requirePublicAlphaUser(req);
    const { data, error } = await db
      .from("public_app_conversations")
      .select("id,title,created_at,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return publicJson(req, { ok: true, conversations: data ?? [] });
  } catch (error) {
    if (error instanceof PublicAlphaError) {
      return publicJson(req, { ok: false, error: error.code }, error.status);
    }
    console.error("[public-app] conversation list failed (details withheld)");
    return publicJson(req, { ok: false, error: "public_app_unavailable" }, 503);
  }
}

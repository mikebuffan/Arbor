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
    if (new URL(req.url).searchParams.get("export") === "1") {
      // Explicit opt-in export. Every query is bound to the verified JWT owner.
      // Refuse excessive archives rather than silently exporting partial data.
      const takeAll = async (table: "public_app_conversations" | "public_app_messages",
        fields: string, ceiling: number) => {
        const rows: Record<string, unknown>[] = [];
        for (let offset = 0; offset <= ceiling; offset += 500) {
          const { data: page, error: readError } = await db
            .from(table).select(fields).eq("user_id", userId)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(offset, offset + 499);
          if (readError) throw readError;
          rows.push(...(page ?? []));
          if (rows.length > ceiling) {
            throw new PublicAlphaError("export_too_large", 413);
          }
          if ((page ?? []).length < 500) break;
        }
        return rows;
      };
      const conversations = await takeAll("public_app_conversations",
        "id,title,created_at,updated_at", 2000);
      const messages = await takeAll("public_app_messages",
        "id,conversation_id,turn_id,role,content,created_at", 20000);
      return publicJson(req, {
        ok: true,
        format: "arbor-public-alpha-v1",
        generatedAt: new Date().toISOString(),
        conversations,
        messages,
        includes: ["public_app_conversations", "public_app_messages"],
      });
    }
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

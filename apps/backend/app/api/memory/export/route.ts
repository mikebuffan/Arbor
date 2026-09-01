import { NextRequest, NextResponse } from "next/server";
import { supabaseFromAuthHeader } from "@/lib/supabase/bearer";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseFromAuthHeader(req);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") ?? null;
    if (projectId) {
      await assertProjectOwnedByUser(supabase, data.user.id, projectId);
    }

    const includeDiscarded =
      url.searchParams.get("includeDiscarded") === "true";
    let query = supabase
      .from("memory_items")
      .select("key, value, tier, status, deleted_at")
      .eq("user_id", data.user.id);

    query = projectId
      ? query.eq("project_id", projectId)
      : query.is("project_id", null);

    if (!includeDiscarded) {
      query = query.is("deleted_at", null).eq("status", "active");
    }

    const { data: items, error: listError } = await query
      .order("pinned", { ascending: false })
      .order("importance", { ascending: false })
      .limit(500);
    if (listError) throw listError;

    const md =
      `# Arbor / Firefly Memory Export\nGenerated: ${new Date().toISOString()}\n\n` +
      (items ?? [])
        .map((item) => {
          const value =
            typeof item.value === "object" &&
            item.value !== null &&
            "text" in item.value
              ? String(item.value.text)
              : JSON.stringify(item.value);
          return `- (${item.tier}/${item.status}) ${item.key}: ${value}`;
        })
        .join("\n");

    return new NextResponse(md, {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}

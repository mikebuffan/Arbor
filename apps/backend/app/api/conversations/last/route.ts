import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import {
  RouteAccessError,
  routeErrorResponse,
} from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";

const QuerySchema = z.object({
  projectId: z.string().uuid(),
});

export async function GET(req: Request) {
  try {
    const { supabase: supa, userId } = await requireUser(req);

    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      projectId: url.searchParams.get("projectId"),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const { data, error } = await supa
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .eq("project_id", parsed.data.projectId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new RouteAccessError(500, "conversation_lookup_failed");
    }

    if (!data?.id) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({ conversationId: data.id });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

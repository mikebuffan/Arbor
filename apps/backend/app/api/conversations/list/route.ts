import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseFromAuthHeader } from "@/lib/supabaseFromAuthHeader";

export const runtime = "nodejs";

const QuerySchema = z.object({
  projectId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

class UnauthorizedError extends Error {}

async function requireUser(req: Request) {
  const supa = supabaseFromAuthHeader(req);
  const { data, error } = await supa.auth.getUser();
  if (error || !data?.user) throw new UnauthorizedError();
  return { supa, userId: data.user.id };
}

function serverError() {
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}

export async function GET(req: Request) {
  try {
    const { supa, userId } = await requireUser(req);

    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      projectId: url.searchParams.get("projectId"),
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const { projectId, limit } = parsed.data;

    const { data, error } = await supa
      .from("conversations")
      .select("id, project_id, created_at")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return serverError();

    return NextResponse.json({ conversations: data ?? [] });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return serverError();
  }
}

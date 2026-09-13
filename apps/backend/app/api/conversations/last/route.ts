import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseFromAuthHeader } from "@/lib/supabaseFromAuthHeader";

export const runtime = "nodejs";

const QuerySchema = z.object({
  projectId: z.string().uuid(),
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
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      projectId: url.searchParams.get("projectId"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const { supa, userId } = await requireUser(req);

    const { data, error } = await supa
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .eq("project_id", parsed.data.projectId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return serverError();

    if (!data?.id) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({ conversationId: data.id });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return serverError();
  }
}

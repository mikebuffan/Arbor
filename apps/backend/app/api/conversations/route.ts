import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseFromAuthHeader } from "@/lib/supabaseFromAuthHeader";

export const runtime = "nodejs";

const BodySchema = z.object({
  projectId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
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

export async function POST(req: Request) {
  try {
    const { supa, userId } = await requireUser(req);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const { projectId, conversationId } = parsed.data;

    const { data: project, error: pErr } = await supa
      .from("projects")
      .select("id, persona_id, framework_version")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();

    if (pErr || !project) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (conversationId) {
      const { data: convo, error: cErr } = await supa
        .from("conversations")
        .select("id, project_id, user_id, created_at")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .eq("project_id", projectId)
        .single();

      if (cErr || !convo) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }

      return NextResponse.json({
        project,
        conversation: convo,
        created: false,
      });
    }

    const { data: created, error: insErr } = await supa
      .from("conversations")
      .insert({
        user_id: userId,
        project_id: projectId,
      })
      .select("id, project_id, user_id, created_at")
      .single();

    if (insErr || !created) return serverError();

    return NextResponse.json({
      project,
      conversation: created,
      created: true,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return serverError();
  }
}

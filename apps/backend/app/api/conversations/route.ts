import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import {
  RouteAccessError,
  routeErrorResponse,
} from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";

const BodySchema = z.object({
  projectId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const { supabase: supa, userId } = await requireUser(req);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { projectId, conversationId } = parsed.data;

    // RLS is authoritative. The explicit owner constraint keeps this route's
    // failure mode deterministic even if a future query shape changes.
    const { data: project, error: projectError } = await supa
      .from("projects")
      .select("id, persona_id, framework_version")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();

    if (projectError || !project) {
      throw new RouteAccessError(404, "project_not_found");
    }

    if (conversationId) {
      const { data: conversation, error: conversationError } = await supa
        .from("conversations")
        .select("id, project_id, user_id, created_at")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .eq("project_id", projectId)
        .single();

      if (conversationError || !conversation) {
        throw new RouteAccessError(404, "conversation_not_found");
      }

      return NextResponse.json({
        project,
        conversation,
        created: false,
      });
    }

    const { data: created, error: insertError } = await supa
      .from("conversations")
      .insert({
        user_id: userId,
        project_id: projectId,
      })
      .select("id, project_id, user_id, created_at")
      .single();

    if (insertError || !created) {
      throw new RouteAccessError(500, "conversation_create_failed");
    }

    return NextResponse.json({
      project,
      conversation: created,
      created: true,
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

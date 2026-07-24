import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { consolidateEpisodeCandidates } from "@/lib/arbor/episodes/consolidateEpisodeCandidates";
import {
  requireAdminAuthorization,
  routeErrorResponse,
} from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  episodeId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const { supabase, userId } = await requireUser(req);
    requireAdminAuthorization(req);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const { episodeId, projectId } = parsed.data;

    const result = await consolidateEpisodeCandidates({
      supabase,
      userId,
      projectId,
      episodeId,
    });

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}

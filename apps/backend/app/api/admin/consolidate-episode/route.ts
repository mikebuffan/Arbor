import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { consolidateEpisodeCandidates } from "@/lib/arbor/episodes/consolidateEpisodeCandidates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  episodeId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
});

function requireAdmin(req: Request) {
  const token = req.headers.get("x-admin-token");
  if (!token || token !== process.env.ARBOR_ADMIN_TOKEN) {
    throw new Error("admin_unauthorized");
  }
}

export async function POST(req: Request) {
  try {
    requireAdmin(req);
    const { supabase, userId } = await requireUser(req);

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
  } catch (err: any) {
    const msg = err?.message ?? "server_error";
    const status = msg === "admin_unauthorized" ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

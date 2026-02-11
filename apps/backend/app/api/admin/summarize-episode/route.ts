import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { summarizeEpisode } from "@/lib/arbor/episodes/summarizeEpisode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  episodeId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
});

function requireAdmin(req: Request) {
  const token =
    (req.headers.get("x-admin-token") ??
      req.headers.get("x-admin-secret") ??
      "").trim();

  const expected = (process.env.ARBOR_ADMIN_TOKEN ?? "").trim();

  if (!expected) {
    throw new Error("ARBOR_ADMIN_TOKEN missing");
  }
  if (!token || token !== expected) {
    const err: any = new Error("sum admin_unauthorized");
        console.log("=== ADMIN DEBUG START ===");
        console.log("x-admin-token header:", req.headers.get("x-admin-token"));
        console.log("authorization header present:", Boolean(req.headers.get("authorization")));
        console.log("ARBOR_ADMIN_TOKEN present:", Boolean(process.env.ARBOR_ADMIN_TOKEN));
        console.log("ARBOR_ADMIN_TOKEN length:", process.env.ARBOR_ADMIN_TOKEN?.length);
        console.log("=== ADMIN DEBUG END ===");
    err.code = "admin_unauthorized";
    throw err;
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

    const result = await summarizeEpisode({
      supabase,
      userId,
      projectId,
      episodeId,
    });

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "server_error" }, { status: 500 });
  }
}

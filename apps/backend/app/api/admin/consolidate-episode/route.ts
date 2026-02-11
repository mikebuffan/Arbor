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
  const token =
    (req.headers.get("x-admin-token") ??
      req.headers.get("x-admin-secret") ?? 
      "").trim();

  const expected = (process.env.ARBOR_ADMIN_TOKEN ?? "").trim();

  if (!expected) {
    throw new Error("ARBOR_ADMIN_TOKEN missing");
  }
  if (!token || token !== expected) {
    console.log("[ADMIN DEBUG] con x-admin-token =", req.headers.get("x-admin-token"));
    console.log("[ADMIN DEBUG] con x-admin-secret =", req.headers.get("x-admin-secret"));
    console.log("[ADMIN DEBUG] con authorization =", req.headers.get("authorization")?.slice(0, 40));
    console.log("[ADMIN DEBUG] con ARBOR_ADMIN_TOKEN set =", Boolean(process.env.ARBOR_ADMIN_TOKEN));
    console.log("[ADMIN DEBUG] con ARBOR_ADMIN_TOKEN len =", (process.env.ARBOR_ADMIN_TOKEN ?? "").length);
    const err: any = new Error("con admin_unauthorized");
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

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseFromAuthHeader } from "@/lib/supabase/bearer";
import { correctMemoryItem } from "@/lib/memory/store";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  decision: z.enum(["yes", "no"]),
  projectId: z.string().uuid().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1) Auth via bearer
    const supabase = supabaseFromAuthHeader(req);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const userId = data.user.id;

    // 2) Validate body
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const decision = parsed.data.decision;
    const projectId = parsed.data.projectId ?? null;
    if (projectId) {
      await assertProjectOwnedByUser(supabase, userId, projectId);
    }

    // 3) Load latest pending row for this user/project
    let pendingQuery = supabase
      .from("memory_pending")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    pendingQuery = projectId
      ? pendingQuery.eq("project_id", projectId)
      : pendingQuery.is("project_id", null);

    const { data: pending, error: pErr } = await pendingQuery.maybeSingle();
    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    if (!pending) {
      return NextResponse.json({ ok: true, applied: false, appliedIds: [] });
    }

    // 4) Apply or discard
    let appliedIds: string[] = [];

    if (decision === "yes") {
      const ops = Array.isArray(pending.ops) ? pending.ops : [];

      for (const op of ops) {
        const key = String(op?.mem_key ?? op?.key ?? "").trim();
        const value = op?.mem_value ?? op?.value;
        if (!key || value == null) continue;

        const result = await correctMemoryItem({
          supabase,
          authedUserId: userId,
          projectId,
          key,
          newValue: value,
        });
        if (result.id) appliedIds.push(result.id);
      }
    }

    // 5) Delete pending row
    const { error: dErr } = await supabase
      .from("memory_pending")
      .delete()
      .eq("id", pending.id);
    if (dErr) {
      return NextResponse.json({ error: dErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      applied: decision === "yes",
      appliedIds: Array.from(new Set(appliedIds)),
    });
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}

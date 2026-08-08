import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseFromAuthHeader } from "@/lib/supabase/bearer";
import { correctMemoryItem } from "@/lib/memory/store";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";
import {
  selectEligibleConfirmationCandidate,
  type PendingConfirmationRow,
} from "@/lib/memory/confirmationEligibility";

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

    // 3) Load only rows whose persisted shape can represent confirmation.
    let pendingQuery = supabase
      .from("memory_pending")
      .select("id,user_id,project_id,question,ops,event_type,created_at")
      .eq("user_id", userId)
      .is("event_type", null)
      .neq("question", "memory_event")
      .order("created_at", { ascending: false })
      .limit(25);

    pendingQuery = projectId
      ? pendingQuery.eq("project_id", projectId)
      : pendingQuery.is("project_id", null);

    const { data: pendingRows, error: pErr } = await pendingQuery;
    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    const pending = selectEligibleConfirmationCandidate(
      (pendingRows ?? []) as PendingConfirmationRow[],
    );

    if (!pending) {
      return NextResponse.json({ ok: true, applied: false, appliedIds: [] });
    }

    // 4) Apply or discard
    const appliedIds: string[] = [];

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
    let deleteQuery = supabase
      .from("memory_pending")
      .delete()
      .eq("id", pending.id)
      .eq("user_id", userId);
    deleteQuery = projectId
      ? deleteQuery.eq("project_id", projectId)
      : deleteQuery.is("project_id", null);
    const { error: dErr } = await deleteQuery;
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

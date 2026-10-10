import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseFromAuthHeader } from "@/lib/supabase/bearer";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";

const Body = z.object({
  memoryId: z.string().uuid().optional(),
  key: z.string().min(1).optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = supabaseFromAuthHeader(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { memoryId, key, projectId } = parsed.data;
    if (projectId) {
      await assertProjectOwnedByUser(supabase, auth.user.id, projectId);
    }

    if (!memoryId && !key) {
      return NextResponse.json(
        { ok: false, error: "memoryId or key required" },
        { status: 400 },
      );
    }

    let query = supabase
      .from("memory_items")
      .select("id, key, locked, deleted_at")
      .eq("user_id", auth.user.id)
      .is("deleted_at", null);

    if (memoryId) {
      query = query.eq("id", memoryId);
    } else {
      query = query.eq("key", key!);
    }

    if (projectId) {
      query = query.eq("project_id", projectId);
    } else if (!memoryId) {
      query = query.is("project_id", null);
    }

    const { data: rows, error: fetchErr } = await query;

    if (fetchErr) {
      return routeErrorResponse(fetchErr);
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "memory not found" },
        { status: 404 },
      );
    }

    const locked = rows.find((r) => r.locked);
    if (locked) {
      return NextResponse.json(
        { ok: false, error: "cannot delete locked memory" },
        { status: 403 },
      );
    }

    const ids = rows.map((r) => r.id);

    // Ownership, scope and lock state may change between the read and write.
    // Return success only for rows the guarded mutation actually changed.
    let update = supabase
      .from("memory_items")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids)
      .eq("user_id", auth.user.id)
      .eq("locked", false)
      .is("deleted_at", null);
    if (projectId) {
      update = update.eq("project_id", projectId);
    } else if (!memoryId) {
      update = update.is("project_id", null);
    }
    const { data: deletedRows, error: updateErr } = await update.select("id");

    if (updateErr) {
      return routeErrorResponse(updateErr);
    }
    if (!deletedRows || deletedRows.length !== ids.length) {
      // Some rows may already have changed; this is not a rollback guarantee.
      return NextResponse.json(
        { ok: false, error: "memory_changed_during_delete" },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      deletedCount: deletedRows.length,
      ids: deletedRows.map((row) => row.id),
    });
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}

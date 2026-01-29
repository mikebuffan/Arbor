import { NextRequest, NextResponse } from "next/server";
import { supabaseFromAuthHeader } from "@/lib/supabase/bearer";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = supabaseFromAuthHeader(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));
  const admin = supabaseAdmin();
  const nowIso = new Date().toISOString();

  const base = admin.from("memory_items");

  if (body.action === "pin") {
    const pinned = !!body.pinned;

    const { data: item, error: uErr } = await admin
      .from("memory_items")
      .update({ pinned, updated_at: nowIso })
      .eq("id", id)
      .eq("user_id", data.user.id)
      .select("id, key, pinned, tier, locked, status, deleted_at")
      .maybeSingle();

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    return NextResponse.json({ item });
  }

  if (body.action === "discard") {
    const { data: item, error: uErr } = await base
      .update({
        deleted_at: nowIso,
        status: "tombstoned",
        updated_at: nowIso,
      })
      .eq("id", id)
      .eq("user_id", data.user.id)
      .select("id, key, pinned, tier, locked, status, deleted_at")
      .maybeSingle();

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    return NextResponse.json({ item });
  }

  if (body.action === "confirmFact") {
    const lock = body.lock === undefined ? true : !!body.lock;

    const { data: item, error: uErr } = await base
      .update({
        confidence: 1.0,
        tier: "core",
        pinned: true,
        locked: lock,
        updated_at: nowIso,
        last_reinforced_at: nowIso,
      })
      .eq("id", id)
      .eq("user_id", data.user.id)
      .select("id, key, pinned, tier, locked, status, deleted_at")
      .maybeSingle();

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    return NextResponse.json({ item });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

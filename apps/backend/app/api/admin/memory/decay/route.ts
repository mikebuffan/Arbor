import { NextRequest, NextResponse } from "next/server";
import { supabaseFromAuthHeader } from "@/lib/supabase/bearer";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function decayConfidence(currentConfidence: number): number {
  return Math.max(0.25, Math.min(1, currentConfidence * 0.98));
}

export async function POST(req: NextRequest) {
  const supabase = supabaseFromAuthHeader(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const { data: items, error: selErr } = await admin
    .from("memory_items")
    .select("id,tier,locked,pinned,confidence,last_reinforced_at,created_at,status,deleted_at")
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(5000);

  if (selErr) return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });

  const mutable = (items ?? []).filter(
    (it: any) => !it.locked && !it.pinned && it.tier !== "core"
  );

  for (const it of mutable) {
    const next = decayConfidence(Number(it.confidence ?? 0.75));

    const { error: updErr } = await admin
      .from("memory_items")
      .update({ confidence: next, updated_at: new Date().toISOString() })
      .eq("id", it.id);

    if (updErr)
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, processed: mutable.length, scanned: (items ?? []).length });
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { calculateDecayStrength } from "@/lib/memory/decayHelpers";
import { requireUser } from "@/lib/auth/requireUser";
import {
  requireAdminAuthorization,
  routeErrorResponse,
} from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    requireAdminAuthorization(req);

    const admin = supabaseAdmin();
    const { data: items, error: selErr } = await admin
      .from("memory_items")
      .select("id,strength,last_reinforced_at,created_at")
      .limit(5000);

    if (selErr) throw selErr;

    for (const it of items ?? []) {
      const next = calculateDecayStrength(
        Number(it.strength ?? 1),
        it.last_reinforced_at ?? it.created_at,
      );

      const { error: updErr } = await admin
        .from("memory_items")
        .update({ strength: next })
        .eq("id", it.id);

      if (updErr) throw updErr;
    }

    return NextResponse.json({ ok: true, processed: (items ?? []).length });
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}

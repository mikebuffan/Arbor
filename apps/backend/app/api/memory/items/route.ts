import { NextRequest, NextResponse } from "next/server";
import { supabaseFromAuthHeader } from "@/lib/supabase/bearer";
import { upsertMemoryItems } from "@/lib/memory/store";
import type { MemoryItem } from "@/lib/memory/types";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";

function memoryTier(value: unknown): MemoryItem["tier"] {
  return value === "core" || value === "sensitive" ? value : "normal";
}

function memoryScope(value: unknown): MemoryItem["scope"] {
  return value === "global" || value === "project"
    ? value
    : "conversation";
}

export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseFromAuthHeader(req);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId"); // may be null
    const includeDiscarded = url.searchParams.get("includeDiscarded") === "true";
    if (projectId) {
      await assertProjectOwnedByUser(supabase, data.user.id, projectId);
    }

    let q = supabase
      .from("memory_items")
      .select(
        "id, key, value, tier, scope, user_trigger_only, importance, confidence, locked, pinned, status, deleted_at, created_at, updated_at, last_seen_at, last_reinforced_at, mention_count, correction_count, project_id, conversation_id"
      )
      .eq("user_id", data.user.id);

    if (projectId) q = q.eq("project_id", projectId);

    if (!includeDiscarded) {
      q = q.is("deleted_at", null).eq("status", "active");
    }

    q = q
      .order("pinned", { ascending: false })
      .order("importance", { ascending: false })
      .order("last_reinforced_at", { ascending: false })
      .order("mention_count", { ascending: false })
      .limit(500);

    const { data: items, error: qErr } = await q;
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    return NextResponse.json({ items: items ?? [] });
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseFromAuthHeader(req);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const rawBody: unknown = await req.json().catch(() => ({}));
    const body =
      rawBody && typeof rawBody === "object"
        ? (rawBody as Record<string, unknown>)
        : {};

    const key = String(body.key ?? body.mem_key ?? "").trim();
    const rawValue = body.value ?? body.mem_value ?? body.text ?? body.correctedValue ?? "";
    const value: MemoryItem["value"] =
      typeof rawValue === "string"
        ? { text: rawValue }
        : rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
          ? (rawValue as Record<string, unknown>)
          : {};

    if (!key) return NextResponse.json({ error: "missing key" }, { status: 400 });

    const item: MemoryItem = {
      key,
      value,
      tier: memoryTier(body.tier),
      user_trigger_only: !!(body.user_trigger_only ?? body.userTriggerOnly ?? false),
      importance: Number(body.importance ?? 5),
      confidence: Number(body.confidence ?? 0.75),
      scope: memoryScope(body.scope),
      pinned: !!body.pinned,
      locked: !!body.locked,
    };

    const projectId =
      typeof body.projectId === "string" ? body.projectId : null;
    if (projectId) {
      await assertProjectOwnedByUser(supabase, data.user.id, projectId);
    }

    const res = await upsertMemoryItems(
      data.user.id,
      [item],
      projectId,
      supabase,
    );

    return NextResponse.json({ ok: true, result: res });
  } catch (error: unknown) {
    return routeErrorResponse(error);
  }
}

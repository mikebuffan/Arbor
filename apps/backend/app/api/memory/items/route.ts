import { NextRequest, NextResponse } from "next/server";
import { supabaseFromAuthHeader } from "@/lib/supabase/bearer";
import { upsertMemoryItems } from "@/lib/memory/store";
import type { MemoryItem } from "@/lib/memory/types";
import { assertProjectOwnedByUser, assertConversationOwnedByUser } from "@/lib/auth/ownership";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";

function memoryTier(value: unknown): MemoryItem["tier"] {
  return value === "core" || value === "sensitive" ? value : "normal";
}

function memoryScope(value: unknown): MemoryItem["scope"] {
  return value === "global" || value === "project"
    ? value
    : "conversation";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_STAMP = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|\+00:00)$/;
const SHELF_PAGE_SIZE = 100;
type ShelfCursor = {v: 1; u: string; p: string; c: string | null; t: string; id: string};
function parseShelfCursor(raw: string | null, userId: string, projectId: string, conversationId: string | null): ShelfCursor | null {
  if (!raw || raw.length > 1024 || !/^[a-zA-Z0-9_-]+$/.test(raw)) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const cursor = value as Partial<ShelfCursor>;
    if (cursor.v !== 1 || cursor.u !== userId || cursor.p !== projectId || cursor.c !== conversationId ||
      typeof cursor.id !== "string" || !UUID.test(cursor.id) ||
      typeof cursor.t !== "string" || !UTC_STAMP.test(cursor.t) || !Number.isFinite(Date.parse(cursor.t))) return null;
    return cursor as ShelfCursor;
  } catch {
    return null;
  }
}
function shelfCursor(row: Record<string, unknown>, userId: string, projectId: string, conversationId: string | null): string | null {
  if (typeof row.id !== "string" || !UUID.test(row.id) ||
    typeof row.updated_at !== "string" || !UTC_STAMP.test(row.updated_at) ||
    !Number.isFinite(Date.parse(row.updated_at))) return null;
  const cursor: ShelfCursor = {v: 1, u: userId, p: projectId, c: conversationId, t: row.updated_at, id: row.id};
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}
/** Explicit owner-scoped shelf read, separate from legacy review/export.
 * SQL eligibility precedes pagination. Pages are not immutable snapshots
 * if another writer changes saved memory while a user is browsing. */
export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseFromAuthHeader(req);
    const {data, error} = await supabase.auth.getUser();
    if (error || !data?.user) return NextResponse.json({error: "unauthorized"}, {status: 401});
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    const includeDiscarded = url.searchParams.get("includeDiscarded") === "true";
    const view = url.searchParams.get("view");
    const isShelf = view === "shelf";
    if (view !== null && !isShelf) return NextResponse.json({error: "unsupported view"}, {status: 400});
    if (isShelf) {
      if (!projectId || !UUID.test(projectId) || includeDiscarded) {
        return NextResponse.json({error: "invalid shelf scope"}, {status: 400});
      }
      const conversationId = url.searchParams.get("conversationId");
      if (conversationId !== null && !UUID.test(conversationId)) {
        return NextResponse.json({error: "invalid conversation"}, {status: 400});
      }
      const afterRaw = url.searchParams.get("after");
      const after = parseShelfCursor(afterRaw, data.user.id, projectId, conversationId);
      if (afterRaw !== null && !after) return NextResponse.json({error: "invalid shelf cursor"}, {status: 400});
      await assertProjectOwnedByUser(supabase, data.user.id, projectId);
      if (conversationId) await assertConversationOwnedByUser({supabase, userId: data.user.id, projectId, conversationId});

      let q = supabase.from("memory_items")
        .select("id,key,value,tier,scope,user_trigger_only,excluded_from_memory,status,deleted_at,project_id,conversation_id,updated_at")
        .eq("user_id", data.user.id)
        .eq("project_id", projectId)
        .eq("status", "active")
        .is("deleted_at", null)
        .eq("excluded_from_memory", false)
        .eq("user_trigger_only", false)
        .neq("tier", "sensitive");
      const before = after
        ? "or(updated_at.lt." + after.t + ",and(updated_at.eq." + after.t + ",id.lt." + after.id + "))"
        : null;
      if (conversationId) {
        const projectScope = "and(scope.eq.project,conversation_id.is.null" + (before ? "," + before : "") + ")";
        const conversationScope = "and(scope.eq.conversation,conversation_id.eq." + conversationId + (before ? "," + before : "") + ")";
        q = q.or(projectScope + "," + conversationScope);
      } else {
        q = q.eq("scope", "project").is("conversation_id", null);
        if (before) q = q.or(before);
      }
      const {data: rows, error: qErr} = await q
        .order("updated_at", {ascending: false})
        .order("id", {ascending: false})
        .limit(SHELF_PAGE_SIZE + 1);
      if (qErr) return NextResponse.json({error: "memory_shelf_unavailable"}, {status: 500});
      const items = (rows ?? []).slice(0, SHELF_PAGE_SIZE);
      const hasNextPage = (rows ?? []).length > SHELF_PAGE_SIZE;
      const nextCursor = hasNextPage
        ? shelfCursor(items[items.length - 1] as Record<string, unknown>, data.user.id, projectId, conversationId)
        : null;
      if (hasNextPage && !nextCursor) return NextResponse.json({error: "memory_shelf_cursor_unavailable"}, {status: 500});
      return NextResponse.json({projectId, conversationId, items, nextCursor},
        {headers: {"Cache-Control": "private, no-store"}});
    }
    // Preserve existing explicitly authenticated owner review behavior.
    if (url.searchParams.has("after") || url.searchParams.has("conversationId")) {
      return NextResponse.json({error: "shelf view required"}, {status: 400});
    }
    if (projectId) await assertProjectOwnedByUser(supabase, data.user.id, projectId);
    let q = supabase.from("memory_items")
      .select("id, key, value, tier, scope, user_trigger_only, excluded_from_memory, importance, confidence, locked, pinned, status, deleted_at, created_at, updated_at, last_seen_at, last_reinforced_at, mention_count, correction_count, project_id, conversation_id")
      .eq("user_id", data.user.id);
    if (projectId) q = q.eq("project_id", projectId);
    if (!includeDiscarded) q = q.is("deleted_at", null).eq("status", "active").eq("excluded_from_memory", false);
    q = q.order("pinned", {ascending: false}).order("importance", {ascending: false})
      .order("last_reinforced_at", {ascending: false}).order("mention_count", {ascending: false}).limit(500);
    const {data: items, error: qErr} = await q;
    if (qErr) return routeErrorResponse(qErr);
    return NextResponse.json({items: items ?? []});
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

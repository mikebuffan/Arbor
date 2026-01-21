import { supabaseAdmin } from "@/lib/supabase/admin";

export type AnchorRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  mem_key: string | null;
  mem_value: string | null;
  display_text: string | null;
  scope: string | null;
  pinned: boolean | null;
  locked: boolean | null;
  kind: string | null;
  deleted_at: string | null;
  updated_at: string | null;
};

export async function getProjectAnchors(params: {
  authedUserId: string;
  projectId: string | null;
}) {
  const { authedUserId, projectId } = params;
  const admin = supabaseAdmin();

  // We treat anchors as project-scoped authoritative facts.
  // If projectId is null, return empty (no project to anchor to).
  if (!projectId) return [] as AnchorRow[];

  const { data, error } = await admin
    .from("memory_items")
    .select(
      "id,user_id,project_id,mem_key,mem_value,display_text,scope,pinned,locked,kind,deleted_at,updated_at"
    )
    .eq("user_id", authedUserId)
    .eq("project_id", projectId)
    .eq("kind", "anchor")
    .is("deleted_at", null)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AnchorRow[];
}

export function anchorsToPromptBlock(anchors: AnchorRow[]) {
  if (!anchors?.length) return "";

  // Prefer display_text, otherwise render key/value
  const lines = anchors.map((a) => {
    const text =
      (a.display_text && a.display_text.trim()) ||
      `${a.mem_key ?? "anchor"}: ${a.mem_value ?? ""}`.trim();

    return `- ${text}`;
  });

  return `
ANCHORS (AUTHORITATIVE PROJECT FACTS):
These are the most reliable facts for this project. If any other memory conflicts, prefer these.
${lines.join("\n")}
`.trim();
}

/**
 * Upsert-like behavior WITHOUT relying on a Postgres constraint name.
 * (Partial unique indexes can't be used with Supabase onConflict reliably.)
 * Strategy:
 * 1) Try update existing active row by (user_id, project_id, mem_key)
 * 2) If none updated, insert new row
 */
export async function setProjectAnchor(params: {
  authedUserId: string;
  projectId: string;
  memKey: string;
  memValue: string;
  displayText?: string;
  pinned?: boolean;
  locked?: boolean;
}) {
  const {
    authedUserId,
    projectId,
    memKey,
    memValue,
    displayText,
    pinned = true,
    locked = true,
  } = params;

  const admin = supabaseAdmin();

  // 1) Update existing
  const { data: updated, error: updateError } = await admin
    .from("memory_items")
    .update({
      mem_value: memValue,
      display_text: displayText ?? null,
      pinned,
      locked,
      kind: "anchor",
      scope: "project",
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", authedUserId)
    .eq("project_id", projectId)
    .eq("mem_key", memKey)
    .is("deleted_at", null)
    .select("id");

  if (updateError) throw updateError;

  if (updated && updated.length > 0) {
    return { ok: true, mode: "updated" as const, id: updated[0].id };
  }

  // 2) Insert new
  const { data: inserted, error: insertError } = await admin
    .from("memory_items")
    .insert({
      user_id: authedUserId,
      project_id: projectId,
      mem_key: memKey,
      mem_value: memValue,
      display_text: displayText ?? null,
      pinned,
      locked,
      kind: "anchor",
      scope: "project",
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return { ok: true, mode: "inserted" as const, id: inserted.id };
}


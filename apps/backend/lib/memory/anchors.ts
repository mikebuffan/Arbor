import type { SupabaseClient } from "@supabase/supabase-js";

export type AnchorRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  conversation_id: string | null;
  user_trigger_only: boolean;
  excluded_from_memory: boolean;
  key: string;
  value: any; 
  scope: string | null;
  pinned: boolean | null;
  locked: boolean | null;
  tier: string | null;
  status: string | null;
  deleted_at: string | null;
  updated_at: string | null;
};

function valueToText(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (typeof v.text === "string") return v.text;
    if (typeof v.value === "string") return v.value;
    if (typeof v.name === "string") return v.name;
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

export async function getProjectAnchors(params: {
  supabase: SupabaseClient;
  authedUserId: string;
  projectId: string | null;
}) {
  const { supabase, authedUserId, projectId } = params;

  if (!projectId) return [] as AnchorRow[];

  const { data, error } = await supabase
    .from("memory_items")
    .select(
      "id,user_id,project_id,conversation_id,user_trigger_only,excluded_from_memory,key,value,scope,pinned,locked,tier,status,deleted_at,updated_at"
    )
    .eq("user_id", authedUserId)
    .eq("project_id", projectId)
    .eq("scope", "project")
    .is("conversation_id", null)
    .eq("tier", "core")
    .eq("excluded_from_memory", false)
    .eq("user_trigger_only", false)
    .is("deleted_at", null)
    .eq("status", "active")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  // SQL selection is not a trust boundary by itself: independently confirm
  // persisted owner/scope and never inject excluded or trigger-only records.
  return (data ?? []).filter((row: AnchorRow) =>
    row.user_id === authedUserId &&
    row.project_id === projectId &&
    row.scope === "project" &&
    row.conversation_id === null &&
    row.tier === "core" &&
    row.status === "active" &&
    row.deleted_at === null &&
    row.excluded_from_memory === false &&
    row.user_trigger_only === false,
  );
}

export function anchorsToPromptBlock(anchors: AnchorRow[]) {
  if (!anchors?.length) return "";

  const lines = anchors.map((a) => {
    const text = `${a.key}: ${valueToText(a.value)}`.trim();
    return `- ${text}`;
  });

  return `
ANCHORS (AUTHORITATIVE PROJECT FACTS):
These are the most reliable facts for this project. If any other memory conflicts, prefer these.
Always address the user using "Preferred address" if present. Do not use older names if they conflict.
${lines.join("\n")}
`.trim();
}

export async function setProjectAnchor(params: {
  supabase: SupabaseClient;
  authedUserId: string;
  projectId: string;
  memKey: string;     
  memValue: string;  
  displayText?: string; 
  pinned?: boolean;
  locked?: boolean;
}) {
  const {
    supabase,
    authedUserId,
    projectId,
    memKey,
    memValue,
    pinned = true,
    locked = true,
  } = params;

  const nowIso = new Date().toISOString();

  const payload = {
    user_id: authedUserId,
    project_id: projectId,
    key: memKey,
    value: { text: memValue },
    tier: "core",
    scope: "project",
    pinned,
    locked,
    status: "active",
    deleted_at: null,
    updated_at: nowIso,
    last_seen_at: nowIso,
    last_reinforced_at: nowIso,
  };

  const { data: updated, error: updateError } = await supabase
    .from("memory_items")
    .update(payload)
    .eq("user_id", authedUserId)
    .eq("project_id", projectId)
    .eq("key", memKey)
    .is("deleted_at", null)
    .select("id");

  if (updateError) throw updateError;

  if (updated && updated.length > 0) {
    return { ok: true, mode: "updated" as const, id: updated[0].id };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("memory_items")
    .insert(payload)
    .select("id")
    .single();

  if (insertError) throw insertError;
  return { ok: true, mode: "inserted" as const, id: inserted.id };
}

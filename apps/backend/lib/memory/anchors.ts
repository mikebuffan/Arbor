import { supabaseAdmin } from "@/lib/supabase/admin";

export type AnchorRow = {
  id: string;
  user_id: string;
  project_id: string | null;
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
  authedUserId: string;
  projectId: string | null;
}) {
  const { authedUserId, projectId } = params;
  const admin = supabaseAdmin();

  if (!projectId) return [] as AnchorRow[];

  const { data, error } = await admin
    .from("memory_items")
    .select(
      "id,user_id,project_id,key,value,scope,pinned,locked,tier,status,deleted_at,updated_at"
    )
    .eq("user_id", authedUserId)
    .eq("project_id", projectId)
    .eq("scope", "project")
    .eq("tier", "core")
    .is("deleted_at", null)
    .eq("status", "active")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AnchorRow[];
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
    pinned = true,
    locked = true,
  } = params;

  const admin = supabaseAdmin();
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

  const { data: updated, error: updateError } = await admin
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

  const { data: inserted, error: insertError } = await admin
    .from("memory_items")
    .insert(payload)
    .select("id")
    .single();

  if (insertError) throw insertError;
  return { ok: true, mode: "inserted" as const, id: inserted.id };
}

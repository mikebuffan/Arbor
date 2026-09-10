import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingRuntimeTable } from "@/lib/arbor/runtime/missingRuntimeTable";

export type AnnabelleWorkspace = {
  canon: string[];
  lockedPassages: string[];
  sceneState: string[];
  unresolvedDecisions: string[];
  workingDelta: string | null;
};

const EMPTY_WORKSPACE: AnnabelleWorkspace = {
  canon: [],
  lockedPassages: [],
  sceneState: [],
  unresolvedDecisions: [],
  workingDelta: null,
};

function toStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function loadAnnabelleWorkspace(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
}): Promise<AnnabelleWorkspace> {
  const { data, error } = await input.supabase
    .from("annabelle_workspace_state")
    .select(
      "canon,locked_passages,scene_state,unresolved_decisions,working_delta",
    )
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .maybeSingle();

  if (error) {
    if (isMissingRuntimeTable(error)) return EMPTY_WORKSPACE;
    throw error;
  }

  if (!data) return EMPTY_WORKSPACE;

  return {
    canon: toStrings(data.canon),
    lockedPassages: toStrings(data.locked_passages),
    sceneState: toStrings(data.scene_state),
    unresolvedDecisions: toStrings(data.unresolved_decisions),
    workingDelta:
      typeof data.working_delta === "string" && data.working_delta.trim()
        ? data.working_delta
        : null,
  };
}

export async function persistAnnabelleWorkspace(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  workspace: AnnabelleWorkspace;
}): Promise<void> {
  const { error } = await input.supabase
    .from("annabelle_workspace_state")
    .upsert(
      {
        user_id: input.userId,
        project_id: input.projectId,
        canon: input.workspace.canon,
        locked_passages: input.workspace.lockedPassages,
        scene_state: input.workspace.sceneState,
        unresolved_decisions: input.workspace.unresolvedDecisions,
        working_delta: input.workspace.workingDelta,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,project_id" },
    );

  if (error) {
    if (isMissingRuntimeTable(error)) return;
    throw error;
  }
}

export async function persistAnnabelleWorkspaceRevision(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  workspace: AnnabelleWorkspace;
  reason: string;
}): Promise<void> {
  const { error } = await input.supabase
    .from("annabelle_workspace_revisions")
    .insert({
      id: crypto.randomUUID(),
      user_id: input.userId,
      project_id: input.projectId,
      snapshot: input.workspace,
      reason: input.reason.slice(0, 500),
      created_at: new Date().toISOString(),
    });

  if (error) {
    if (isMissingRuntimeTable(error)) return;
    throw error;
  }
}

export async function updateAnnabelleWorkspace(
  input: {
    supabase: SupabaseClient;
    userId: string;
    projectId: string;
    reason: string;
  },
  mutate: (current: AnnabelleWorkspace) => AnnabelleWorkspace,
): Promise<AnnabelleWorkspace> {
  const current = await loadAnnabelleWorkspace(input);

  await persistAnnabelleWorkspaceRevision({
    ...input,
    workspace: current,
  });

  const next = mutate(current);

  await persistAnnabelleWorkspace({
    ...input,
    workspace: next,
  });

  return next;
}

export async function restoreLatestAnnabelleWorkspaceRevision(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
}): Promise<AnnabelleWorkspace> {
  const { data, error } = await input.supabase
    .from("annabelle_workspace_revisions")
    .select("snapshot")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingRuntimeTable(error)) return loadAnnabelleWorkspace(input);
    throw error;
  }

  if (!data?.snapshot || typeof data.snapshot !== "object") {
    return loadAnnabelleWorkspace(input);
  }

  const snapshot = data.snapshot as Record<string, unknown>;
  const restored: AnnabelleWorkspace = {
    canon: toStrings(snapshot.canon),
    lockedPassages: toStrings(snapshot.lockedPassages),
    sceneState: toStrings(snapshot.sceneState),
    unresolvedDecisions: toStrings(snapshot.unresolvedDecisions),
    workingDelta:
      typeof snapshot.workingDelta === "string"
        ? snapshot.workingDelta
        : null,
  };

  await persistAnnabelleWorkspace({
    ...input,
    workspace: restored,
  });

  return restored;
}

export function annabelleWorkspaceToPromptBlock(
  workspace: AnnabelleWorkspace,
): string {
  const section = (name: string, values: string[]) =>
    values.length
      ? `${name}:\n${values.map((value) => `- ${value}`).join("\n")}`
      : `${name}:\n- none`;

  return [
    "ANNABELLE WORKSPACE",
    section("Canon", workspace.canon),
    section("Locked passages", workspace.lockedPassages),
    section("Current scene state", workspace.sceneState),
    section("Unresolved writing decisions", workspace.unresolvedDecisions),
    `Latest working delta:\n${workspace.workingDelta ?? "(none)"}`,
  ].join("\n\n");
}

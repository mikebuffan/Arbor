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

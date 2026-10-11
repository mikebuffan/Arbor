import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingRuntimeTable } from "@/lib/arbor/runtime/missingRuntimeTable";
import { promptDataBlock } from "@/lib/arbor/promptData";

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

// Atomic mode stays OFF until a separately approved hosted schema migration.
export function annabelleAtomicWorkspaceEnabled(): boolean {
  return process.env.ANNABELLE_ATOMIC_WORKSPACE_ENABLED === "true";
}

function equalWorkspace(a: AnnabelleWorkspace, b: AnnabelleWorkspace): boolean {
  const same = (x: string[], y: string[]) =>
    x.length === y.length && x.every((value, index) => value === y[index]);
  return same(a.canon, b.canon) && same(a.lockedPassages, b.lockedPassages) &&
    same(a.sceneState, b.sceneState) && same(a.unresolvedDecisions, b.unresolvedDecisions) &&
    a.workingDelta === b.workingDelta;
}

// Fail closed when the migration is absent. Never invent version zero on SQL errors.
export async function loadVersionedAnnabelleWorkspace(input: {
  supabase: SupabaseClient; userId: string; projectId: string;
}): Promise<{ workspace: AnnabelleWorkspace; editVersion: number }> {
  const { data, error } = await input.supabase.from("annabelle_workspace_state")
    .select("canon,locked_passages,scene_state,unresolved_decisions,working_delta,edit_version")
    .eq("user_id", input.userId).eq("project_id", input.projectId).maybeSingle();
  if (error) throw error;
  if (!data) return { workspace: structuredClone(EMPTY_WORKSPACE), editVersion: 0 };
  if (!Number.isSafeInteger(data.edit_version) || data.edit_version < 0)
    throw new Error("annabelle_atomic_version_invalid");
  return {
    workspace: {
      canon: toStrings(data.canon),
      lockedPassages: toStrings(data.locked_passages),
      sceneState: toStrings(data.scene_state),
      unresolvedDecisions: toStrings(data.unresolved_decisions),
      workingDelta: typeof data.working_delta === "string" ? data.working_delta : null,
    },
    editVersion: data.edit_version,
  };
}

export async function loadAnnabelleWorkspace(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  requireStorage?: boolean;
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
    if (isMissingRuntimeTable(error) && !input.requireStorage) return EMPTY_WORKSPACE;
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
  if (annabelleAtomicWorkspaceEnabled())
    throw new Error("annabelle_atomic_direct_workspace_write_forbidden");
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
    throw error;
  }

  // Require exact owner-scoped readback before claiming that a draft was saved.
  const { data: saved, error: readError } = await input.supabase
    .from("annabelle_workspace_state")
    .select("canon,locked_passages,scene_state,unresolved_decisions,working_delta")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (readError) throw readError;
  const sameArray = (actual: unknown, expected: string[]) =>
    Array.isArray(actual) && actual.length === expected.length &&
    actual.every((item, index) => item === expected[index]);
  if (!saved ||
    !sameArray(saved.canon, input.workspace.canon) ||
    !sameArray(saved.locked_passages, input.workspace.lockedPassages) ||
    !sameArray(saved.scene_state, input.workspace.sceneState) ||
    !sameArray(saved.unresolved_decisions, input.workspace.unresolvedDecisions) ||
    saved.working_delta !== input.workspace.workingDelta) {
    throw new Error("annabelle_workspace_save_readback_mismatch");
  }
}

export async function persistAnnabelleWorkspaceRevision(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  workspace: AnnabelleWorkspace;
  reason: string;
}): Promise<void> {
  if (annabelleAtomicWorkspaceEnabled())
    throw new Error("annabelle_atomic_direct_revision_write_forbidden");
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
    throw error;
  }
}

export async function updateAnnabelleWorkspace(
  input: {
    supabase: SupabaseClient;
    userId: string;
    projectId: string;
    reason: string;
    expectedVersion?: number;
    requestId?: string;
  },
  mutate: (current: AnnabelleWorkspace) => AnnabelleWorkspace,
): Promise<AnnabelleWorkspace> {
  if (annabelleAtomicWorkspaceEnabled()) {
    if (!Number.isSafeInteger(input.expectedVersion) || (input.expectedVersion ?? -1) < 0)
      throw new Error("annabelle_atomic_expected_version_required");
    if (!input.requestId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId))
      throw new Error("annabelle_atomic_request_id_required");
    const expectedVersion = input.expectedVersion as number;
    const { workspace: current, editVersion } = await loadVersionedAnnabelleWorkspace(input);
    // The SQL transaction recognizes an exact request ID replay BEFORE
    // checking the current version. Reconstruct the original preimage from
    // that already-owned revision rather than rejecting every honest retry
    // here (or recomputing a different payload from the current draft).
    let preimage = current;
    if (editVersion !== expectedVersion) {
      if (editVersion !== expectedVersion + 1)
        throw new Error("annabelle_atomic_version_conflict");
      const { data: receipt, error: receiptError } = await input.supabase
        .from("annabelle_workspace_revisions")
        .select("snapshot,resulting_version")
        .eq("id", input.requestId)
        .eq("user_id", input.userId)
        .eq("project_id", input.projectId)
        .maybeSingle();
      if (receiptError) throw receiptError;
      if (!receipt || receipt.resulting_version !== expectedVersion + 1 ||
          !receipt.snapshot || typeof receipt.snapshot !== "object" ||
          Array.isArray(receipt.snapshot))
        throw new Error("annabelle_atomic_version_conflict");
      const prior = receipt.snapshot as Record<string, unknown>;
      if (![prior.canon, prior.lockedPassages, prior.sceneState,
             prior.unresolvedDecisions].every(value =>
               Array.isArray(value) && value.every(item => typeof item === "string")) ||
          !(typeof prior.workingDelta === "string" || prior.workingDelta === null))
        throw new Error("annabelle_atomic_revision_invalid");
      preimage = {
        canon: toStrings(prior.canon),
        lockedPassages: toStrings(prior.lockedPassages),
        sceneState: toStrings(prior.sceneState),
        unresolvedDecisions: toStrings(prior.unresolvedDecisions),
        workingDelta: prior.workingDelta as string | null,
      };
    }
    const next = mutate(preimage);
    const { data, error } = await input.supabase.rpc("annabelle_save_workspace_atomic", {
      p_project_id: input.projectId,
      p_request_id: input.requestId,
      p_expected_version: expectedVersion,
      p_canon: next.canon,
      p_locked_passages: next.lockedPassages,
      p_scene_state: next.sceneState,
      p_unresolved_decisions: next.unresolvedDecisions,
      p_working_delta: next.workingDelta,
      p_reason: input.reason,
    });
    if (error) throw error;
    if (!data || !["committed", "replayed"].includes(data.status) ||
        data.editVersion !== expectedVersion + 1 ||
        (editVersion !== expectedVersion && data.status !== "replayed"))
      throw new Error("annabelle_atomic_receipt_invalid");
    const verified = await loadVersionedAnnabelleWorkspace(input);
    if (verified.editVersion !== expectedVersion + 1 ||
        !equalWorkspace(verified.workspace, next))
      throw new Error("annabelle_atomic_readback_mismatch");
    return next;
  }
  // Legacy mode is retained only until the approved migration and cutover.
  // A read-only compatibility fallback must never become a successful write.
  const current = await loadAnnabelleWorkspace({ ...input, requireStorage: true });

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
  expectedVersion?: number;
  requestId?: string;
}): Promise<AnnabelleWorkspace> {
  const atomic = annabelleAtomicWorkspaceEnabled();
  if (atomic && (!Number.isSafeInteger(input.expectedVersion) ||
      (input.expectedVersion ?? -1) < 0))
    throw new Error("annabelle_atomic_expected_version_required");
  const revisions = input.supabase
    .from("annabelle_workspace_revisions")
    .select("snapshot")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId);
  // Bind the restoration target to the version the caller actually read.
  // Reusing the same request after a lost response must pick the SAME prior
  // snapshot, not the newer revision created by the first restoration.
  const ordered = atomic
    ? revisions.eq("resulting_version", input.expectedVersion as number)
    : revisions.order("created_at", { ascending: false });
  const { data, error } = await ordered.limit(1).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.snapshot || typeof data.snapshot !== "object") {
    if (annabelleAtomicWorkspaceEnabled())
      throw new Error("annabelle_atomic_revision_not_found");
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

  if (annabelleAtomicWorkspaceEnabled())
    return updateAnnabelleWorkspace(
      { ...input, reason: "restore previous Annabelle workspace" },
      () => restored,
    );

  await persistAnnabelleWorkspace({
    ...input,
    workspace: restored,
  });

  return restored;
}

export function annabelleWorkspaceToPromptBlock(
  workspace: AnnabelleWorkspace,
): string {
  return promptDataBlock("ANNABELLE WORKSPACE", workspace);
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadVersionedAnnabelleWorkspace,
  persistAnnabelleWorkspace,
  persistAnnabelleWorkspaceRevision,
  restoreLatestAnnabelleWorkspaceRevision,
  updateAnnabelleWorkspace,
} from "../annabelleWorkspace";

const owner = { userId: "00000000-0000-4000-8000-000000000001", projectId: "00000000-0000-4000-8000-000000000011" };
const fixture = {
  canon: ["Synthetic character"], lockedPassages: ["Do not overwrite"],
  sceneState: [], unresolvedDecisions: [], workingDelta: "Fictional draft.",
};

function memoryDatabase(options: { dropWrite?: boolean; missingMigration?: boolean } = {}) {
  let state: Record<string, unknown> | null = null;
  const revisionRows: { id: string; snapshot: Record<string, unknown>; resultingVersion: number }[] = [];
  let lastReceipt: { id: string; snapshot: Record<string, unknown>; resultingVersion: number; payload: string } | null = null;
  const upsert = vi.fn(async () => { throw new Error("direct_upsert_must_not_run"); });
  const insert = vi.fn(async () => { throw new Error("direct_revision_insert_must_not_run"); });
  const from = vi.fn((name: string) => {
    const filters: Record<string, unknown> = {};
    const query: any = {
      select: () => query, eq: vi.fn((key: string, value: unknown) => { filters[key] = value; return query; }),
      order: vi.fn(() => query), limit: () => query,
      maybeSingle: async () => {
        if (name === "annabelle_workspace_state")
          return options.missingMigration
            ? { data: null, error: { code: "42703", message: "edit_version missing" } }
            : { data: state, error: null };
        if (name === "annabelle_workspace_revisions") {
          if (filters.id !== undefined) {
            return { data: lastReceipt?.id === filters.id ? {
              snapshot: lastReceipt.snapshot, resulting_version: lastReceipt.resultingVersion,
            } : null, error: null };
          }
          const match = filters.resulting_version === undefined
            ? revisionRows.at(-1)
            : revisionRows.find(row => row.resultingVersion === filters.resulting_version);
          return { data: match ? { snapshot: match.snapshot } : null, error: null };
        }
        throw new Error("unexpected_table:" + name);
      },
      upsert, insert,
    };
    return query;
  });
  const rpc = vi.fn(async (_name: string, args: Record<string, any>) => {
    expect(_name).toBe("annabelle_save_workspace_atomic");
    expect(args.p_project_id).toBe(owner.projectId);
    const oldVersion = state?.edit_version ?? 0;
    const payload = JSON.stringify(args);
    const existingReceipt = lastReceipt;
    if (existingReceipt !== null && existingReceipt.id === args.p_request_id) {
      return existingReceipt.payload === payload
        ? { data: { status: "replayed", editVersion: existingReceipt.resultingVersion }, error: null }
        : { data: null, error: { code: "P0001", message: "annabelle_atomic_request_id_conflict" } };
    }
    if (args.p_expected_version !== oldVersion)
      return { data: null, error: { code: "P0001", message: "annabelle_atomic_version_conflict" } };
    const previous = state ? {
      canon: state.canon, lockedPassages: state.locked_passages, sceneState: state.scene_state,
      unresolvedDecisions: state.unresolved_decisions, workingDelta: state.working_delta,
    } : { canon: [], lockedPassages: [], sceneState: [], unresolvedDecisions: [], workingDelta: null };
    lastReceipt = { id: args.p_request_id, snapshot: { ...previous },
      resultingVersion: (oldVersion as number) + 1, payload };
    revisionRows.push({ id: args.p_request_id, snapshot: { ...previous },
      resultingVersion: (oldVersion as number) + 1 });
    if (!options.dropWrite) state = {
      canon: args.p_canon, locked_passages: args.p_locked_passages,
      scene_state: args.p_scene_state, unresolved_decisions: args.p_unresolved_decisions,
      working_delta: args.p_working_delta, edit_version: (oldVersion as number) + 1,
    };
    return { data: { status: "committed", editVersion: (oldVersion as number) + 1 }, error: null };
  });
  return {
    supabase: { from, rpc } as unknown as SupabaseClient,
    rpc, from, upsert, insert,
    getState: () => state,
  };
}
const idA = "00000000-0000-4000-8000-000000000031";
const idB = "00000000-0000-4000-8000-000000000032";

describe("Annabelle opt-in atomic workspace cutover", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("never permits direct upserts or standalone revisions in atomic mode", async () => {
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    const db = memoryDatabase();
    await expect(persistAnnabelleWorkspace({ ...owner, supabase: db.supabase, workspace: fixture }))
      .rejects.toThrow("annabelle_atomic_direct_workspace_write_forbidden");
    await expect(persistAnnabelleWorkspaceRevision({
      ...owner, supabase: db.supabase, workspace: fixture, reason: "synthetic",
    })).rejects.toThrow("annabelle_atomic_direct_revision_write_forbidden");
    expect(db.upsert).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("commits a synthetic draft via the real atomic caller with fresh readback", async () => {
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    const db = memoryDatabase();
    const result = await updateAnnabelleWorkspace({
      ...owner, supabase: db.supabase, reason: "synthetic", expectedVersion: 0, requestId: idA,
    }, () => fixture);
    expect(result).toEqual(fixture);
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect((await loadVersionedAnnabelleWorkspace({ ...owner, supabase: db.supabase })).editVersion).toBe(1);
    expect(db.upsert).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });


  it("retries the same synthetic save across new client handles without a second revision", async () => {
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    const db = memoryDatabase();
    const scope = { ...owner, reason: "synthetic", expectedVersion: 0, requestId: idA };
    await updateAnnabelleWorkspace({ ...scope, supabase: db.supabase }, () => fixture);

    // New wrapper simulates a reopened HTTP/server client over unchanged storage.
    const reopened = { from: db.from, rpc: db.rpc } as unknown as SupabaseClient;
    const recovered = await updateAnnabelleWorkspace({ ...scope, supabase: reopened }, () => fixture);
    expect(recovered).toEqual(fixture);
    expect(db.rpc).toHaveBeenCalledTimes(2);
    expect((await loadVersionedAnnabelleWorkspace({ ...owner, supabase: reopened })).editVersion).toBe(1);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects a changed replay payload with the original request ID", async () => {
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    const db = memoryDatabase();
    const input = { ...owner, supabase: db.supabase, reason: "synthetic", expectedVersion: 0, requestId: idA };
    await updateAnnabelleWorkspace(input, () => fixture);
    await expect(updateAnnabelleWorkspace(input, () => ({
      ...fixture, workingDelta: "Changed replay payload",
    }))).rejects.toMatchObject({ code: "P0001", message: "annabelle_atomic_request_id_conflict" });
    expect((await loadVersionedAnnabelleWorkspace(input)).workspace).toEqual(fixture);
  });

  it("fails closed when the prior request's recovery snapshot is missing", async () => {
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    const db = memoryDatabase();
    await updateAnnabelleWorkspace({
      ...owner, supabase: db.supabase, reason: "synthetic", expectedVersion: 0, requestId: idA,
    }, () => fixture);
    await expect(updateAnnabelleWorkspace({
      ...owner, supabase: db.supabase, reason: "synthetic", expectedVersion: 0, requestId: idB,
    }, () => fixture)).rejects.toThrow("annabelle_atomic_version_conflict");
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });

  it("rejects missing expected versions, missing request IDs, and stale edits", async () => {
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    const db = memoryDatabase();
    await expect(updateAnnabelleWorkspace({ ...owner, supabase: db.supabase, reason: "synthetic" }, () => fixture))
      .rejects.toThrow("annabelle_atomic_expected_version_required");
    await expect(updateAnnabelleWorkspace({
      ...owner, supabase: db.supabase, reason: "synthetic", expectedVersion: 0,
    }, () => fixture)).rejects.toThrow("annabelle_atomic_request_id_required");
    await updateAnnabelleWorkspace({
      ...owner, supabase: db.supabase, reason: "synthetic", expectedVersion: 0, requestId: idA,
    }, () => fixture);
    await expect(updateAnnabelleWorkspace({
      ...owner, supabase: db.supabase, reason: "stale", expectedVersion: 0, requestId: idB,
    }, () => ({ ...fixture, workingDelta: "stale data" }))).rejects.toThrow("annabelle_atomic_version_conflict");
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });

  it("fails closed when atomic schema is absent instead of using a legacy fallback", async () => {
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    const db = memoryDatabase({ missingMigration: true });
    await expect(updateAnnabelleWorkspace({
      ...owner, supabase: db.supabase, reason: "synthetic", expectedVersion: 0, requestId: idA,
    }, () => fixture)).rejects.toMatchObject({ code: "42703" });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("rejects falsely successful RPCs when the actual draft was not saved", async () => {
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    const db = memoryDatabase({ dropWrite: true });
    await expect(updateAnnabelleWorkspace({
      ...owner, supabase: db.supabase, reason: "synthetic", expectedVersion: 0, requestId: idA,
    }, () => fixture)).rejects.toThrow("annabelle_atomic_readback_mismatch");
  });

  it("uses atomic versioned saving rather than the old upsert for restoration", async () => {
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    const db = memoryDatabase();
    await updateAnnabelleWorkspace({
      ...owner, supabase: db.supabase, reason: "synthetic", expectedVersion: 0, requestId: idA,
    }, () => fixture);
    const restored = await restoreLatestAnnabelleWorkspaceRevision({
      ...owner, supabase: db.supabase, expectedVersion: 1, requestId: idB,
    });
    expect(restored.workingDelta).toBeNull();
    expect(db.rpc).toHaveBeenCalledTimes(2);
    expect(db.upsert).not.toHaveBeenCalled();
    const index = db.from.mock.calls.findIndex(call => call[0] === "annabelle_workspace_revisions");
    expect(index).toBeGreaterThanOrEqual(0);
    expect(db.from.mock.results[index]?.value.eq).toHaveBeenCalledWith(
      "resulting_version", 1,
    );
  });

  it("restores the version requested, then replays identical restore after a new client", async () => {
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    const db = memoryDatabase();
    const first = { ...owner, supabase: db.supabase,
      reason: "synthetic", expectedVersion: 0, requestId: idA };
    await updateAnnabelleWorkspace(first, () => fixture);
    const different = { ...fixture, workingDelta: "Different fictional draft." };
    await updateAnnabelleWorkspace({ ...first, expectedVersion: 1, requestId: idB }, () => different);
    const idC = "00000000-0000-4000-8000-000000000033";
    const scope = { ...owner, supabase: db.supabase, expectedVersion: 2, requestId: idC };
    const restored = await restoreLatestAnnabelleWorkspaceRevision(scope);
    expect(restored).toEqual(fixture);
    expect((await loadVersionedAnnabelleWorkspace(scope)).editVersion).toBe(3);

    // Reopening creates a distinct client over the same durable synthetic store.
    // A retry with the SAME UUID must select version 2's snapshot, not the
    // restoration's new version 3 snapshot.
    const reopened = { from: db.from, rpc: db.rpc } as unknown as SupabaseClient;
    const retry = await restoreLatestAnnabelleWorkspaceRevision({ ...scope, supabase: reopened });
    expect(retry).toEqual(fixture);
    expect((await loadVersionedAnnabelleWorkspace({ ...scope, supabase: reopened })).editVersion).toBe(3);
    expect(db.rpc).toHaveBeenCalledTimes(4);
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it("requires an explicit version before selecting an atomic restore snapshot", async () => {
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    const db = memoryDatabase();
    await expect(restoreLatestAnnabelleWorkspaceRevision({
      ...owner, supabase: db.supabase, requestId: idB,
    })).rejects.toThrow("annabelle_atomic_expected_version_required");
    expect(db.from).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("never claims a successful atomic restore when no previous revision exists", async () => {
    vi.stubEnv("ANNABELLE_ATOMIC_WORKSPACE_ENABLED", "true");
    const db = memoryDatabase();
    await expect(restoreLatestAnnabelleWorkspaceRevision({
      ...owner, supabase: db.supabase, expectedVersion: 0, requestId: idA,
    })).rejects.toThrow("annabelle_atomic_revision_not_found");
    expect(db.rpc).not.toHaveBeenCalled();
  });
});

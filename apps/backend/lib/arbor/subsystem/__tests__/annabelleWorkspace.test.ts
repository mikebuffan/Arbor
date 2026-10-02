import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  loadAnnabelleWorkspace, persistAnnabelleWorkspace,
  persistAnnabelleWorkspaceRevision, restoreLatestAnnabelleWorkspaceRevision,
  updateAnnabelleWorkspace,
} from "../annabelleWorkspace";

const workspace = {
  canon: ["Ever"], lockedPassages: ["locked"], sceneState: [],
  unresolvedDecisions: [], workingDelta: null,
};
const missing = { code: "42P01", message: "relation does not exist" };

function database(results: Record<string, { data?: unknown; error?: unknown }>) {
  const writes = vi.fn();
  const from = vi.fn((table: string) => {
    const result = { data: null, error: null, ...results[table] };
    const chain: any = {
      select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
      maybeSingle: async () => result,
      upsert: async (...args: unknown[]) => { writes(table, ...args); return result; },
      insert: async (...args: unknown[]) => { writes(table, ...args); return result; },
    };
    return chain;
  });
  return { supabase: { from } as unknown as SupabaseClient, writes };
}
const scope = { userId: "owner", projectId: "novel" };

describe("Annabelle durable workspace failures", () => {
  it("allows a read-only legacy fallback but prevents mutation from that empty fallback", async () => {
    const db = database({ annabelle_workspace_state: { error: missing } });
    expect((await loadAnnabelleWorkspace({ ...scope, ...db })).canon).toEqual([]);
    const mutate = vi.fn(() => workspace);
    await expect(updateAnnabelleWorkspace({ ...scope, ...db, reason: "correction" }, mutate)).rejects.toEqual(missing);
    expect(mutate).not.toHaveBeenCalled();
    expect(db.writes).not.toHaveBeenCalled();
  });

  it("does not claim a workspace or revision was saved when its table is missing", async () => {
    const db = database({
      annabelle_workspace_state: { error: missing },
      annabelle_workspace_revisions: { error: missing },
    });
    await expect(persistAnnabelleWorkspace({ ...scope, ...db, workspace })).rejects.toEqual(missing);
    await expect(persistAnnabelleWorkspaceRevision({ ...scope, ...db, workspace, reason: "edit" })).rejects.toEqual(missing);
  });

  it("stops before overwriting the workspace if revision preservation fails", async () => {
    const db = database({ annabelle_workspace_revisions: { error: missing } });
    await expect(updateAnnabelleWorkspace({ ...scope, ...db, reason: "edit" }, () => workspace)).rejects.toEqual(missing);
    expect(db.writes.mock.calls.map(call => call[0])).toEqual(["annabelle_workspace_revisions"]);
  });

  it("does not report a restore when the revision store is unavailable", async () => {
    const db = database({ annabelle_workspace_revisions: { error: missing } });
    await expect(restoreLatestAnnabelleWorkspaceRevision({ ...scope, ...db })).rejects.toEqual(missing);
    expect(db.writes).not.toHaveBeenCalled();
  });

  it("returns a changed workspace only after revision and state writes succeed", async () => {
    const db = database({});
    const next = await updateAnnabelleWorkspace({ ...scope, ...db, reason: "edit" }, () => workspace);
    expect(next).toEqual(workspace);
    expect(db.writes.mock.calls.map(call => call[0])).toEqual([
      "annabelle_workspace_revisions", "annabelle_workspace_state",
    ]);
  });
});

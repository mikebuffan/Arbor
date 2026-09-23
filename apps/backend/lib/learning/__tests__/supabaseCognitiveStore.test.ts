import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseCognitiveStore } from "../supabaseCognitiveStore";
import { createCognitiveProjectSnapshot } from "../cognitiveSessionPort";
import { newPathwayLearningState } from "../associativeLearningLab";

const scope = { userId: "11111111-1111-4111-8111-111111111111",
  projectId: "22222222-2222-4222-8222-222222222222" };
const initial = () => createCognitiveProjectSnapshot({
  scope, learning: newPathwayLearningState(scope.userId, scope.projectId),
  pathways: [], ledger: { scope, receipts: {} },
});
function fakeClient(row: unknown = null, dbError: unknown = null, rpcValue: unknown = true) {
  const maybeSingle = vi.fn(async () => ({ data: row, error: dbError }));
  const query = { eq: vi.fn(), maybeSingle };
  query.eq.mockReturnValue(query);
  const select = vi.fn(() => query);
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn(async () => ({ data: rpcValue, error: dbError }));
  const client = { from, rpc } as unknown as SupabaseClient;
  return { client, from, select, query, rpc, maybeSingle };
}
describe("Optional Supabase cognitive port (synthetic DB responses, not deployed)", () => {
  it("returns null when no approved snapshot exists", async () => {
    const db = fakeClient();
    expect(await new SupabaseCognitiveStore(db.client).read(scope)).toBeNull();
    expect(db.from).toHaveBeenCalledWith("arbor_cognitive_project_state");
    expect(db.query.eq).toHaveBeenCalledWith("user_id", scope.userId);
    expect(db.query.eq).toHaveBeenCalledWith("project_id", scope.projectId);
  });
  it("accepts only matching row and nested snapshot revision/scope", async () => {
    const snap = initial();
    const good = fakeClient({ user_id: scope.userId, project_id: scope.projectId,
      revision: 0, snapshot: snap });
    expect(await new SupabaseCognitiveStore(good.client).read(scope)).toEqual(snap);
    const bad = fakeClient({ user_id: scope.userId, project_id: scope.projectId,
      revision: 2, snapshot: snap });
    await expect(new SupabaseCognitiveStore(bad.client).read(scope))
      .rejects.toThrow("cognitive_store_snapshot_revision_or_scope_invalid");
    const foreign = fakeClient({ user_id: "other", project_id: scope.projectId,
      revision: 0, snapshot: snap });
    await expect(new SupabaseCognitiveStore(foreign.client).read(scope))
      .rejects.toThrow("cognitive_store_row_scope_invalid");
  });
  it("calls exactly one owner/project/revision-scoped atomic SQL RPC", async () => {
    const db = fakeClient();
    const next = { ...initial(), revision: 1 };
    expect(await new SupabaseCognitiveStore(db.client)
      .compareAndSwap({ scope, expectedRevision: 0, next })).toBe(true);
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(db.rpc).toHaveBeenCalledWith("arbor_cas_cognitive_project_state", {
      p_user_id: scope.userId, p_project_id: scope.projectId,
      p_expected_revision: 0, p_next_snapshot: next,
    });
  });
  it("rejects wrong revision, cross-project write and non-boolean success claims", async () => {
    const db = fakeClient(null, null, { status: "OK" });
    const store = new SupabaseCognitiveStore(db.client);
    await expect(store.compareAndSwap({ scope, expectedRevision: 0,
      next: { ...initial(), revision: 2 } })).rejects.toThrow("cognitive_store_cas_invalid");
    await expect(store.compareAndSwap({ scope, expectedRevision: 0,
      next: { ...initial(), scope: { ...scope, projectId: "foreign" }, revision: 1 } }))
      .rejects.toThrow("cognitive_store_cas_invalid");
    expect(db.rpc).not.toHaveBeenCalled();
    await expect(store.compareAndSwap({ scope, expectedRevision: 0,
      next: { ...initial(), revision: 1 } }))
      .rejects.toThrow("cognitive_store_cas_result_invalid");
  });
  it("propagates row read and CAS errors without interpreting failure as an empty state", async () => {
    const db = fakeClient(null, { message: "synthetic RLS denial" });
    await expect(new SupabaseCognitiveStore(db.client).read(scope))
      .rejects.toMatchObject({ message: "synthetic RLS denial" });
    await expect(new SupabaseCognitiveStore(db.client).compareAndSwap({ scope,
      expectedRevision: 0, next: { ...initial(), revision: 1 } }))
      .rejects.toMatchObject({ message: "synthetic RLS denial" });
  });
});
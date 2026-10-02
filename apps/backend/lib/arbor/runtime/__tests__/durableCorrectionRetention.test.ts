import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
const stored = vi.hoisted(() => ({ rows: [] as any[], upsert: vi.fn() }));
vi.mock("@/lib/memory/store", () => ({ upsertMemoryItems: (...args: any[]) => stored.upsert(...args) }));
import { loadDurableBehaviorCorrections, promoteRepeatedBehaviorCorrections } from "../correctionPromotion";
import { loadRuntimeState } from "../runtimeStateStore";
import { mergeCorrectionSnapshots } from "../runtimeState";
import { projectRuntimeStartup } from "../hostProjection";
const correction = { id: "behavior:identity-drift", kind: "behavior" as const, value: "Do not become too formal",
  source: "text" as const, observedAt: "2025-01-01T00:00:00Z", confidence: 1, protected: true, occurrences: 1 };
const row = { id: "permanent", user_id: "owner", project_id: null, conversation_id: null, scope: "global", status: "active", deleted_at: null,
  key: "behavior.correction.identity-drift", value: { text: correction.value, last_observed_at: correction.observedAt, occurrences: 1, source: "text" }, confidence: 1 };
function database(memories: any[], snapshots: any[] = [], error: any = null) {
  const calls: any[] = [];
  return { calls, supabase: { from(table: string) {
    const filters: [string, unknown][] = []; calls.push({ table, filters });
    return { select() { return this; }, eq(key: string, value: unknown) { filters.push([key, value]); return this; },
      is(key: string, value: unknown) { filters.push([key, value]); return this; }, in(key: string, value: unknown) { filters.push([key, value]); return this; },
      neq() { return this; }, order() { return this; },
      async maybeSingle() { return { data: null, error }; },
      async limit(count: number) { return { data: (table === "memory_items" ? memories : snapshots).slice(0, count), error }; },
    };
  } } as unknown as SupabaseClient };
}
describe("permanent correction retention", () => {
  it("saves an explicitly authorized first correction through the existing global memory store", async () => {
    stored.upsert.mockReset().mockResolvedValue({ created: ["permanent"], updated: [] });
    const db = database([]);
    const result = await promoteRepeatedBehaviorCorrections({ supabase: db.supabase, userId: "owner", corrections: [correction], currentUserText: "Remember this: do not become too formal" });
    expect(result.promoted).toEqual(["permanent"]);
    expect(stored.upsert).toHaveBeenCalledWith("owner", [expect.objectContaining({ key: row.key, scope: "global", pinned: true,
      value: expect.objectContaining({ occurrences: 1 }) })], null, db.supabase, null);
  });
  it("does not save without durable authorization or reinterpret accent as behavioral memory", async () => {
    stored.upsert.mockClear(); const db = database([]);
    await promoteRepeatedBehaviorCorrections({ supabase: db.supabase, userId: "owner", corrections: [correction], currentUserText: "That response was too formal" });
    await promoteRepeatedBehaviorCorrections({ supabase: db.supabase, userId: "owner", corrections: [{ ...correction, kind: "acoustic", value: "British accent" }], currentUserText: "Remember this accent" });
    expect(stored.upsert).not.toHaveBeenCalled();
  });
  it("survives the 50-conversation recall boundary and reaches startup correction context", async () => {
    const snapshots = Array.from({ length: 60 }, (_, i) => {
      const state = { schemaVersion: 1 as const, userId: "owner", projectId: "project", conversationId: `thread-${i}`, channel: "text" as const,
        activeSubsystem: "arbor" as const, currentGoal: "work", lastMeaningfulUserTurn: "working", lastMeaningfulArborTurn: null, agency: null,
        corrections: i === 59 ? [correction] : [], behaviorProof: null, pendingSelfUpdate: null, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" };
      return { user_id: "owner", project_id: "project", conversation_id: state.conversationId, state };
    });
    const db = database([row], snapshots);
    const runtime = await loadRuntimeState({ supabase: db.supabase, userId: "owner", projectId: "project", conversationId: "new" });
    expect(runtime?.corrections).toEqual([]);
    const permanent = await loadDurableBehaviorCorrections({ supabase: db.supabase, userId: "owner" });
    expect(projectRuntimeStartup({ ...runtime!, corrections: mergeCorrectionSnapshots([permanent, runtime!.corrections]) }).startup.promptBlock).toContain(correction.value);
    const memoryQuery = db.calls.find(call => call.table === "memory_items");
    expect(memoryQuery.filters).toContainEqual(["user_id", "owner"]);
    expect(memoryQuery.filters).toContainEqual(["scope", "global"]);
    expect(memoryQuery.filters).toContainEqual(["project_id", null]);
  });
  it("rejects foreign, deleted, non-global and duplicated corrections even if storage returns them", async () => {
    for (const patch of [{ user_id: "foreign" }, { project_id: "foreign" }, { status: "tombstoned" }, { deleted_at: "2026-01-01" }]) {
      await expect(loadDurableBehaviorCorrections({ supabase: database([{ ...row, ...patch }]).supabase, userId: "owner" })).rejects.toThrow("scope_or_duplicate");
    }
    await expect(loadDurableBehaviorCorrections({ supabase: database([row, row]).supabase, userId: "owner" })).rejects.toThrow("scope_or_duplicate");
  });
  it("does not overwrite a newer permanent correction from an older thread", async () => {
    stored.upsert.mockClear();
    const newer = { ...row, value: { ...row.value, last_observed_at: "2026-10-02T00:00:00Z" } };
    expect(await promoteRepeatedBehaviorCorrections({ supabase: database([newer]).supabase, userId: "owner",
      corrections: [correction], currentUserText: "Remember this calibration" })).toEqual({ promoted: [] });
    expect(stored.upsert).not.toHaveBeenCalled();
  });
  it("propagates storage failures instead of silently treating permanent memory as empty", async () => {
    await expect(loadDurableBehaviorCorrections({ supabase: database([], [], { code: "42501" }).supabase, userId: "owner" })).rejects.toEqual({ code: "42501" });
  });
  it("lets a newer runtime correction supersede the older durable value without erasing storage", async () => {
    const permanent = await loadDurableBehaviorCorrections({ supabase: database([row]).supabase, userId: "owner" });
    const latest = { ...correction, value: "Too formal: use my newer calibration", observedAt: "2026-10-02T00:00:00Z" };
    expect(mergeCorrectionSnapshots([permanent, [latest]])[0].value).toBe(latest.value);
    expect(row.value.text).toBe(correction.value);
  });
});

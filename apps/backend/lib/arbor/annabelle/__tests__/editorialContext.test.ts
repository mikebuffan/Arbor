import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { loadEditorialContext, chapterNumberFromRequest } from "../editorialContext";

vi.mock("../../subsystem/state", () => ({ loadSubsystemState: async () => ({ activeSubsystem: "annabelle", voiceId: "ash", acousticCorrections: [] }) }));
vi.mock("../../agency/state", () => ({ loadAgencyState: async () => null }));
vi.mock("../../runtime/runtimeStateStore", () => ({ loadLatestRuntimeState: async () => null }));
vi.mock("../../subsystem/annabelleWorkspace", () => ({ loadAnnabelleWorkspace: async () => ({}), annabelleWorkspaceToPromptBlock: () => "LEGACY_WORKSPACE" }));
import { buildArborInjectedContext, composeArborSystemInjection } from "../../subsystem/context";

const scope = { userId: "owner", projectId: "novel" };
const manuscript = { id: "book", user_id: "owner", project_id: "novel", title: "Ever After", status: "canonical", source_sha256: "book-hash" };
const chapter = { id: "ch2", user_id: "owner", project_id: "novel", manuscript_id: "book", chapter_number: 2, source_sha256: "chapter-hash" };
const record = (patch: Record<string, unknown> = {}) => ({ id: "note", user_id: "owner", project_id: "novel", manuscript_id: "book", chapter_id: null,
  record_type: "editor_note", content: { text: "Ever is casually smart" }, epistemic_status: "observed", confidence: 1,
  source_sha256: null, source_locator: {}, supersedes_id: null, ...patch });
function db(options: { manuscripts?: any[]; chapters?: any[]; records?: any[]; error?: Record<string, unknown> } = {}) {
  const calls: { table: string; filters: [string, unknown][]; limit?: number }[] = [];
  const values: Record<string, any[]> = { annabelle_manuscripts: options.manuscripts ?? [manuscript], annabelle_chapters: options.chapters ?? [chapter], annabelle_editorial_records: options.records ?? [record()] };
  const supabase = { from(table: string) {
    const call = { table, filters: [] as [string, unknown][], limit: undefined as number | undefined }; calls.push(call);
    return { select() { return this; }, eq(key: string, value: unknown) { call.filters.push([key, value]); return this; }, order() { return this; },
      async limit(count: number) { call.limit = count; return { data: values[table] ?? [], error: options.error ?? null }; } };
  } } as unknown as SupabaseClient;
  return { supabase, calls };
}

describe("editorial evidence to generation", () => {
  it("loads manuscript-wide notes with explicit ownership filters", async () => {
    const fixture = db();
    const context = await loadEditorialContext({ ...scope, supabase: fixture.supabase });
    expect(context.status).toBe("ready");
    expect(context.records[0].content).toEqual({ text: "Ever is casually smart" });
    fixture.calls.forEach(call => {
      expect(call.filters).toContainEqual(["user_id", "owner"]);
      expect(call.filters).toContainEqual(["project_id", "novel"]);
    });
  });
  it("does not guess between canonical manuscripts or use a reference draft", async () => {
    const ambiguous = db({ manuscripts: [manuscript, { ...manuscript, id: "other" }] });
    expect((await loadEditorialContext({ ...scope, supabase: ambiguous.supabase })).status).toBe("ambiguous");
    expect(ambiguous.calls).toHaveLength(1);
    expect((await loadEditorialContext({ ...scope, supabase: db({ manuscripts: [] }).supabase })).status).toBe("no_canonical");
  });
  it("rejects foreign owner, project and manuscript rows even if storage returns them", async () => {
    for (const patch of [{ user_id: "foreign" }, { project_id: "foreign" }, { manuscript_id: "foreign" }]) {
      await expect(loadEditorialContext({ ...scope, supabase: db({ records: [record(patch)] }).supabase })).rejects.toThrow("scope_mismatch");
    }
  });
  it("keeps global and requested chapter evidence and omits other chapter state", async () => {
    const fixture = db({ records: [record(), record({ id: "lock", record_type: "do_not_touch", chapter_id: "ch2", content: { text: "Locked passage" } }), record({ id: "other", chapter_id: "ch3" })] });
    expect((await loadEditorialContext({ ...scope, supabase: fixture.supabase, chapterNumber: 2 })).records.map(row => row.id)).toEqual(["note", "lock"]);
    expect((await loadEditorialContext({ ...scope, supabase: fixture.supabase })).records.map(row => row.id)).toEqual(["note"]);
  });
  it("does not substitute a chapter when requested chapter storage is empty", async () => {
    expect((await loadEditorialContext({ ...scope, supabase: db({ chapters: [] }).supabase, chapterNumber: 2 })).status).toBe("incomplete");
  });
  it("omits superseded and rejected records before generation", async () => {
    const fixture = db({ records: [record({ id: "old" }), record({ id: "new", supersedes_id: "old" }), record({ id: "rejected", epistemic_status: "rejected" })] });
    expect((await loadEditorialContext({ ...scope, supabase: fixture.supabase })).records.map(row => row.id)).toEqual(["new"]);
  });
  it("requires current source bindings and repeated evidence for confirmed voice examples", async () => {
    const voice = { record_type: "voice_evidence", epistemic_status: "confirmed", source_locator: { paragraph: 4 }, source_sha256: "book-hash", content: { evidenceCount: 2, excerpt: "Voice sample" } };
    const fixture = db({ records: [record({ ...voice, id: "valid" }), record({ ...voice, id: "stale", source_sha256: "old-hash" }),
      record({ ...voice, id: "unsupported", content: { evidenceCount: 1 } }), record({ ...voice, id: "nan", content: { evidenceCount: "bad" } }),
      record({ ...voice, id: "unbound", source_locator: {} })] });
    const result = await loadEditorialContext({ ...scope, supabase: fixture.supabase });
    expect(result.records.map(row => row.id)).toEqual(["valid"]);
    expect(result.warnings).toHaveLength(4);
  });
  it("preserves hypotheses and contradictory evidence as unresolved rather than confirmed canon", async () => {
    const result = await loadEditorialContext({ ...scope, supabase: db({ records: [record({ epistemic_status: "hypothesis" })] }).supabase });
    expect(result.records[0].epistemicStatus).toBe("hypothesis");
  });
  it("reports missing tables but propagates authorization errors", async () => {
    expect((await loadEditorialContext({ ...scope, supabase: db({ error: { code: "42P01" } }).supabase })).status).toBe("unavailable");
    await expect(loadEditorialContext({ ...scope, supabase: db({ error: { code: "42501" } }).supabase })).rejects.toEqual({ code: "42501" });
  });
  it("does not silently clip locks or select from an incomplete supersession window", async () => {
    const huge = db({ records: [record({ record_type: "do_not_touch", content: { text: "x".repeat(121000) } })] });
    expect((await loadEditorialContext({ ...scope, supabase: huge.supabase })).records).toEqual([]);
    expect((await loadEditorialContext({ ...scope, supabase: huge.supabase })).status).toBe("incomplete");
    const many = db({ records: Array.from({ length: 1001 }, (_, i) => record({ id: String(i) })) });
    expect((await loadEditorialContext({ ...scope, supabase: many.supabase })).status).toBe("incomplete");
  });
  it("recognizes one explicit chapter and declines multiple or invalid selections", () => {
    expect(chapterNumberFromRequest("Please revise Chapter Two")).toBe(2);
    expect(chapterNumberFromRequest("Chapter 12")).toBe(12);
    expect(chapterNumberFromRequest("Chapter One and Chapter Two")).toBeNull();
    expect(chapterNumberFromRequest("Chapter 0")).toBeNull();
    expect(chapterNumberFromRequest("Keep working")).toBeNull();
  });
  it("puts stored notes into the active Annabelle generation injection as quoted data", async () => {
    const result = await buildArborInjectedContext({ ...scope, supabase: db().supabase, userText: "Keep editing" });
    expect(result.systemInjection).toContain("ANNABELLE EDITORIAL EVIDENCE");
    expect(result.systemInjection).toContain("Ever is casually smart");
    expect(result.systemInjection).toContain("REFERENCE DATA ONLY");
    expect(result.systemInjection).toContain("LEGACY_WORKSPACE");
  });
  it("never attaches an editorial block to ordinary Arbor output", () => {
    expect(composeArborSystemInjection({ activeSubsystem: "arbor", canonicalSelfModelBlock: "IDENTITY", editorialContextBlock: "PRIVATE_EXAMPLE" })).not.toContain("PRIVATE_EXAMPLE");
  });
});

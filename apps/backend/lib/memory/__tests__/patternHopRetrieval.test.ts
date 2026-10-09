import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/memory/embeddings", () => ({ embedText: vi.fn(async () => { throw new Error("test_embedding_disabled"); }) }));
import { searchMemoryHopEvidence } from "../patternHopRetrieval";

describe("Pattern Hop memory eligibility", () => {
  it("never recovers excluded memories through a different retrieval engine", async () => {
    const row = {
      id: "eligible", user_id: "owner", project_id: "project",
      conversation_id: null, scope: "project", key: "agency continuity",
      value: "agency continuity", tier: "normal", confidence: .9,
      memory_kind: "fact", status: "active", deleted_at: null,
      user_trigger_only: false, excluded_from_memory: false,
      updated_at: "2026-10-08", created_at: "2026-10-07",
    };
    const q: any = {};
    for (const key of ["select", "eq", "is", "neq", "or", "order"]) q[key] = vi.fn(() => q);
    q.limit = vi.fn(async () => ({ data: [row, { ...row, id: "excluded", excluded_from_memory: true }, { ...row, id: "unknown", excluded_from_memory: undefined }], error: null }));
    const db = { from: vi.fn(() => q) };
    const evidence = await searchMemoryHopEvidence({ supabase: db as never, userId: "owner", projectId: "project", clue: "agency continuity" });
    expect(evidence.map(item => item.id)).toEqual(["memory:eligible"]);
    expect(q.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(q.eq).toHaveBeenCalledWith("excluded_from_memory", false);
    expect(q.or).toHaveBeenCalledWith("scope.eq.global,and(scope.eq.project,project_id.eq.project)");
  });
});

import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createPatternHopRun, savePatternHopRun } from "../patternHopStore";
import type { PatternHopState } from "../patternHop";

const scope = { runId: "run-1", userId: "owner-1", projectId: "project-1" };
const state: PatternHopState = {
  objective: "Synthetic research", maxDepth: 6, frontier: [], visited: [],
  completedBranches: [], exhaustedBranches: [], status: "active", blocker: null,
};
const receipt = {
  id: scope.runId, user_id: scope.userId, project_id: scope.projectId,
  conversation_id: "conversation-1", objective: state.objective,
  max_depth: 6, frontier: [], visited: [], completed_branches: [],
  exhausted_branches: [], status: "active", blocker: null,
};

function database(data: unknown, error: unknown = null) {
  const filters: Array<[string, unknown]> = [];
  const query: any = {};
  query.insert = vi.fn(() => query);
  query.update = vi.fn(() => query);
  query.select = vi.fn(() => query);
  query.eq = (key: string, value: unknown) => { filters.push([key, value]); return query; };
  query.single = query.maybeSingle = async () => ({ data, error });
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve);
  return { supabase: { from: () => query } as never, filters };
}

describe("Pattern Hop run write receipts", () => {
  it("accepts creation only for the requested owner, project and conversation", async () => {
    const db = database(receipt);
    const created = await createPatternHopRun({ ...scope, supabase: db.supabase,
      conversationId: "conversation-1", objective: state.objective });
    expect(created.id).toBe(scope.runId);
    expect(created.conversationId).toBe("conversation-1");
  });

  it.each([
    null, { ...receipt, id: "" }, { ...receipt, user_id: "foreign" },
    { ...receipt, project_id: "foreign" }, { ...receipt, conversation_id: "foreign" },
  ])("rejects missing or misrouted creation receipts", async data => {
    const db = database(data);
    await expect(createPatternHopRun({ ...scope, supabase: db.supabase,
      conversationId: "conversation-1", objective: state.objective }))
      .rejects.toThrow("pattern_hop_run_insert_scope_invalid");
  });

  it("accepts a scoped update receipt and retains all query filters", async () => {
    const db = database(receipt);
    await expect(savePatternHopRun({ ...scope, supabase: db.supabase, state })).resolves.toBeUndefined();
    expect(db.filters).toEqual([["id", scope.runId], ["user_id", scope.userId], ["project_id", scope.projectId]]);
  });

  it.each([
    null, { ...receipt, id: "another-run" }, { ...receipt, user_id: "foreign" },
    { ...receipt, project_id: "foreign" }, {},
  ])("rejects zero-row or mismatched checkpoint updates", async data => {
    const db = database(data);
    await expect(savePatternHopRun({ ...scope, supabase: db.supabase, state }))
      .rejects.toThrow("pattern_hop_run_update_scope_invalid");
  });

  it("propagates database write failures", async () => {
    const error = new Error("synthetic_write_failure");
    const db = database(null, error);
    await expect(savePatternHopRun({ ...scope, supabase: db.supabase, state })).rejects.toBe(error);
  });

  it("requests a receipt through the installed SDK without a network call", async () => {
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(receipt), { status: 200, headers: { "Content-Type": "application/json" } }));
    const client = createClient("https://synthetic.invalid", "synthetic-key", {
      global: { fetch: fetchMock }, auth: { persistSession: false, autoRefreshToken: false },
    });
    await savePatternHopRun({ ...scope, supabase: client, state });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    const requestUrl = new URL(String(url));
    expect(requestUrl.searchParams.get("select")).toBe("id,user_id,project_id");
    expect(requestUrl.searchParams.get("id")).toBe("eq.run-1");
    expect(init?.method).toBe("PATCH");
    expect(new Headers(init?.headers).get("Prefer")).toContain("return=representation");
  });
});

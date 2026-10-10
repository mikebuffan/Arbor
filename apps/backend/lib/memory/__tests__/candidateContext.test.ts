import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ supabaseAdmin: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: mocks.supabaseAdmin }));

import { getProvisionalMemoryCandidateContext } from "../candidateContext";

const userId = "fixture-owner";
const projectId = "fixture-project";
const candidate = (id: string, overrides: Record<string, unknown> = {}) => ({
  id, user_id: userId, project_id: projectId, status: "proposed",
  candidate_json: {
    category: "project", mem_key: id, content: id,
    score: 0.9, confidence: 0.85, confirm_count: 2,
  },
  ...overrides,
});

function mockedAdmin(rows: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: rows, error }),
  };
  for (const name of ["select", "eq", "order"] as const) {
    query[name].mockReturnValue(query);
  }
  const from = vi.fn().mockReturnValue(query);
  mocks.supabaseAdmin.mockReturnValue({ from });
  return { from, query };
}

describe("provisional candidate owner and forgetting guards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechecks administrative results before any candidate content enters a prompt", async () => {
    const malicious = mockedAdmin([
      candidate("approved"),
      candidate("foreign-owner-secret", { user_id: "other-user" }),
      candidate("foreign-project-secret", { project_id: "other-project" }),
      candidate("promoted-secret", { status: "promoted" }),
      candidate("excluded-secret", { candidate_json: {
        category: "project", mem_key: "excluded",
        content: "excluded-secret", score: 1, confidence: 1,
        confirm_count: 3, excluded_from_memory: true,
      } }),
      candidate("sensitive-secret", { candidate_json: {
        category: "project", mem_key: "sensitive",
        content: "sensitive-secret", score: 1, confidence: 1,
        confirm_count: 3, sensitive: true,
      } }),
      candidate("malformed", { candidate_json: ["unexpected", "array"] }),
    ]);
    const result = await getProvisionalMemoryCandidateContext({
      userId, projectId, latestUserText: "What is the current status?",
    });
    expect(result.selected.map((item) => item.id)).toEqual(["approved"]);
    expect(result.promptBlock).toContain("approved");
    for (const forbidden of [
      "foreign-owner-secret", "foreign-project-secret", "promoted-secret",
      "excluded-secret", "sensitive-secret", "malformed",
    ]) expect(result.promptBlock).not.toContain(forbidden);
    expect(malicious.from).toHaveBeenCalledWith("ar_memory_candidates");
    expect(malicious.query.select).toHaveBeenCalledWith(
      "id,user_id,project_id,candidate_json,status,updated_at",
    );
    expect(malicious.query.eq).toHaveBeenCalledWith("user_id", userId);
    expect(malicious.query.eq).toHaveBeenCalledWith("project_id", projectId);
    expect(malicious.query.eq).toHaveBeenCalledWith("status", "proposed");
  });

  it("does not select a weak candidate by counting copies of one thread as independent observations", async () => {
    mockedAdmin([
      candidate("duplicate-thread", { candidate_json: { content: "duplicate-thread",
        score: 0.6, confidence: 0.5, confirm_count: 0, observed_threads: ["one", " one ", "one"] } }),
      candidate("blank-threads", { candidate_json: { content: "blank-threads",
        score: 0.6, confidence: 0.5, confirm_count: 0, observed_threads: ["", " ", ""] } }),
      candidate("independent-threads", { candidate_json: { content: "independent-threads",
        score: 0.6, confidence: 0.5, confirm_count: 0, observed_threads: ["one", "two"] } }),
    ]);
    const result = await getProvisionalMemoryCandidateContext({ userId, projectId, latestUserText: "continue" });
    expect(result.selected.map(item => item.id)).toEqual(["independent-threads"]);
    expect(result.promptBlock).not.toContain("duplicate-thread");
    expect(result.promptBlock).not.toContain("blank-threads");
  });

  it("fails closed when administrative candidate storage is unavailable", async () => {
    mockedAdmin([], { message: "not authorized" });
    const result = await getProvisionalMemoryCandidateContext({
      userId, projectId, latestUserText: "continue",
    });
    expect(result).toEqual({ promptBlock: "", selected: [] });
  });
  it("skips malformed candidate content and cue phrases without dropping valid memory", async () => {
    mockedAdmin([
      candidate("valid-signal"),
      candidate("numeric-content", { candidate_json: {
        category: "project", content: 42, score: 1, confidence: 1,
        confirm_count: 2,
      } }),
      candidate("object-content", { candidate_json: {
        category: "project", content: { text: "not a string" },
        score: 1, confidence: 1, confirm_count: 2,
      } }),
      candidate("malformed-cue-collection", { candidate_json: {
        category: "cue", content: "not-a-safe-cue",
        source_phrases: { text: "hello" }, score: 1,
        confidence: 1, confirm_count: 2,
      } }),
      candidate("malformed-cue-values", { candidate_json: {
        category: "cue", content: "also-not-a-safe-cue",
        source_phrases: [null, 7, { phrase: "hello" }],
        score: 1, confidence: 1, confirm_count: 2,
      } }),
      candidate("valid-cue", { candidate_json: {
        category: "cue", content: "valid-cue",
        source_phrases: [null, "hello"], score: 0.9,
        confidence: 0.85, confirm_count: 2,
      } }),
    ]);
    const result = await getProvisionalMemoryCandidateContext({
      userId, projectId, latestUserText: "hello, please continue",
    });
    expect(result.selected.map((item) => item.id)).toEqual([
      "valid-signal", "valid-cue",
    ]);
    for (const disallowed of [
      "numeric-content", "object-content", "not-a-safe-cue",
      "also-not-a-safe-cue",
    ]) expect(result.promptBlock).not.toContain(disallowed);
    expect(result.promptBlock).toContain("valid-cue");
  });

  it("treats an invalid administrative result collection as no optional candidates", async () => {
    mockedAdmin({ unexpected: "not a row array" });
    const result = await getProvisionalMemoryCandidateContext({
      userId, projectId, latestUserText: "continue",
    });
    expect(result).toEqual({ promptBlock: "", selected: [] });
  });

  it.each([
    ["missing id", { id: undefined }],
    ["blank id", { id: "  " }],
    ["object id", { id: {} }],
    ["invalid score", { candidate_json: { content: "unsafe", score: "bad", confirm_count: 2 } }],
    ["infinite confidence", { candidate_json: { content: "unsafe", confidence: Infinity, confirm_count: 2 } }],
    ["object confirmation", { candidate_json: { content: "unsafe", score: 1, confirm_count: {} } }],
    ["fake thread collection", { candidate_json: { content: "unsafe", score: 1, observed_threads: "abc" } }],
    ["object memory key", { candidate_json: { content: "unsafe", score: 1, mem_key: {} } }],
  ])("skips %s while retaining usable evidence", async (_label, overrides) => {
    mockedAdmin([candidate("unsafe", overrides), candidate("valid")]);
    const result = await getProvisionalMemoryCandidateContext({
      userId, projectId, latestUserText: "continue",
    });
    expect(result.selected.map((item) => item.id)).toEqual(["valid"]);
    expect(result.promptBlock).not.toContain("unsafe");
  });

  it("keeps legacy finite numeric strings and optional metadata usable", async () => {
    mockedAdmin([candidate("legacy", { candidate_json: {
      content: "legacy signal", score: "0.9", confidence: "0.85", confirm_count: "2",
    } })]);
    const result = await getProvisionalMemoryCandidateContext({ userId, projectId, latestUserText: "continue" });
    expect(result.selected.map((item) => item.id)).toEqual(["legacy"]);
    expect(result.promptBlock).toContain("[legacy] legacy signal");
  });

});

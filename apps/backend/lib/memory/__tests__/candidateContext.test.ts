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

function mockedAdmin(rows: unknown[], error: unknown = null) {
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

  it("fails closed when administrative candidate storage is unavailable", async () => {
    mockedAdmin([], { message: "not authorized" });
    const result = await getProvisionalMemoryCandidateContext({
      userId, projectId, latestUserText: "continue",
    });
    expect(result).toEqual({ promptBlock: "", selected: [] });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), upsert: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: mocks.admin }));
vi.mock("@/lib/memory/store", () => ({ upsertMemoryItems: mocks.upsert }));

import { promoteEligibleMemoryCandidates } from "../promoteCandidates";
import { reinforceMemoryCandidate } from "../reinforceCandidate";

const owner = "synthetic-user";
const project = "synthetic-project";
const candidateJson = {
  category: "preference", mem_key: "coffee", content: "Synthetic preference",
  score: 0.9, confidence: 0.9, confirm_count: 2, contradiction_count: 0,
  observed_threads: ["t1", "t2"],
};

function table(rows: Record<string, unknown>[]) {
  const filters: Array<[string, unknown]> = [];
  const chain: any = {};
  chain.select = chain.order = chain.limit = chain.update = chain.insert = () => chain;
  chain.eq = (field: string, value: unknown) => {
    filters.push([field, value]); return chain;
  };
  const selected = () => rows.filter(row => filters.every(([k, v]) => row[k] === v));
  chain.then = (resolve: any, reject: any) =>
    Promise.resolve({ data: selected(), error: null }).then(resolve, reject);
  chain.maybeSingle = async () => ({ data: selected()[0] ?? null, error: null });
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("B12 candidate lifecycle exclusion (synthetic only)", () => {
  it("does not embed, promote or update a previously excluded candidate", async () => {
    const from = vi.fn(() => table([{
      id: "excluded-1", user_id: owner, project_id: project, status: "proposed",
      candidate_json: { ...candidateJson, excluded_from_memory: true },
    }]));
    mocks.admin.mockReturnValue({ from });
    const result = await promoteEligibleMemoryCandidates({
      userId: owner, projectId: project, conversationId: "synthetic-thread", supabase: {} as any,
    });
    expect(result.promoted).toEqual([]);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("does not reinforce or log excluded and foreign-scoped admin readbacks", async () => {
    for (const row of [
      { id: "c1", user_id: owner, project_id: project, status: "proposed",
        candidate_json: { ...candidateJson, excluded_from_memory: true } },
      { id: "c1", user_id: "foreign", project_id: project, status: "proposed",
        candidate_json: candidateJson },
      { id: "c1", user_id: owner, project_id: project, status: "proposed",
        candidate_json: ["malformed"] },
    ]) {
      const from = vi.fn(() => table([row]));
      // Force a malformed/foreign row past SQL mock filtering to exercise readback.
      const forced = table([row]);
      forced.maybeSingle = async () => ({ data: row, error: null });
      from.mockReturnValue(forced);
      mocks.admin.mockReturnValue({ from });
      const result = await reinforceMemoryCandidate({
        candidateId: "c1", userId: owner, projectId: project,
        threadId: "synthetic-thread", event: "observed",
      });
      expect(result).toEqual({ updated: false });
      expect(from).toHaveBeenCalledTimes(1);
    }
  });

  it("preserves ordinary promotion of a valid eligible scoped synthetic candidate", async () => {
    const key = "learned.preference.coffee";
    const row = { id: "c2", user_id: owner, project_id: project,
      status: "proposed", candidate_json: candidateJson };
    const from = vi.fn(() => table([row]));
    mocks.admin.mockReturnValue({ from });
    mocks.upsert.mockResolvedValue({ created: [key], updated: [], ignored: [] });
    const result = await promoteEligibleMemoryCandidates({
      userId: owner, projectId: project, conversationId: "synthetic-thread", supabase: {} as any,
    });
    expect(result.promoted).toEqual([key]);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });
});

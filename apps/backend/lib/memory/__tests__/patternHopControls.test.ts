import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ load: vi.fn(), create: vi.fn(), save: vi.fn(), evidence: vi.fn(), edges: vi.fn(), loadEvidence: vi.fn(), loadEdges: vi.fn(), historical: vi.fn(), memory: vi.fn(), timeline: vi.fn() }));
vi.mock("../patternHopStore", () => ({ loadPatternHopRun: mocks.load, createPatternHopRun: mocks.create, savePatternHopRun: mocks.save, persistPatternHopEvidence: mocks.evidence, persistPatternHopEdges: mocks.edges, loadPatternHopEvidence: mocks.loadEvidence, loadPatternHopEdges: mocks.loadEdges }));
vi.mock("../patternHopRetrieval", () => ({ searchHistoricalHopEvidence: mocks.historical, searchMemoryHopEvidence: mocks.memory, searchTimelineHopEvidence: mocks.timeline, classifyHistoricalEvidence: () => ({ evidenceType: "direct_user_statement", epistemicStatus: "direct" }) }));
import { runControlledPatternHopResearch, stopPatternHopRun } from "../patternHopControls";
let state: any, token: string | null, stopped: boolean, expired: boolean, commits: any[];
const rpc = vi.fn(async (name: string, args: any) => {
  expect(args.p_user_id).toBe("owner"); expect(args.p_project_id).toBe("project"); expect(args.p_run_id).toBe("run");
  if (name === "arbor_stop_pattern_hop_run") { stopped = true; return { data: "stop_requested", error: null }; }
  if (name === "arbor_claim_pattern_hop_run") {
    if (stopped) return { data: "stopped", error: null };
    if (token && !expired) return { data: "busy", error: null };
    token = args.p_lease_token; expired = false; return { data: "claimed", error: null };
  }
  if (name === "arbor_release_pattern_hop_run") {
    if (args.p_lease_token !== token) return { data: "lease_lost", error: null };
    token = null; return { data: "released", error: null };
  }
  if (stopped) return { data: "stopped", error: null };
  if (expired || args.p_lease_token !== token) return { data: "lease_lost", error: null };
  if (name === "arbor_commit_pattern_hop_checkpoint") { commits.push(structuredClone(args)); state = structuredClone(args.p_state); return { data: "committed", error: null }; }
  if (name === "arbor_renew_pattern_hop_run") return { data: "renewed", error: null };
  throw new Error("unknown RPC");
});
const input = { supabase: { rpc } as never, userId: "owner", projectId: "project", runId: "run", seed: "agency", maxHops: 1 };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("ARBOR_ENABLE_PATTERN_HOP_CONTROLS", "true");
  state = { objective: "trace", maxDepth: 2, frontier: [{ evidenceId: "seed", clue: "agency", depth: 0, branch: "direct_matches" }], visited: [], completedBranches: [], exhaustedBranches: [], status: "active" };
  token = null; stopped = false; expired = false; commits = [];
  mocks.load.mockImplementation(async () => ({ id: "run", state: structuredClone(state), seed: { clue: "agency" } }));
  mocks.loadEvidence.mockResolvedValue([]); mocks.loadEdges.mockResolvedValue([]);
  mocks.historical.mockResolvedValue([{ id: "source", source: "fixture", role: "user", content: "agency backend", similarity: 1 }]);
  mocks.memory.mockResolvedValue([]); mocks.timeline.mockResolvedValue([]);
});
describe("controlled existing Pattern Hop runner", () => {
  it("commits evidence, edges and advanced state in one fenced checkpoint", async () => {
    await runControlledPatternHopResearch(input);
    expect(commits[0].p_evidence).toHaveLength(1); expect(commits[0].p_edges).toHaveLength(1); expect(commits[0].p_state.visited).toHaveLength(1);
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.evidence).not.toHaveBeenCalled(); expect(mocks.edges).not.toHaveBeenCalled(); expect(token).toBeNull();
  });
  it("rejects overlapping continuations before a second retrieval", async () => {
    let entered!: () => void, release!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const waiting = new Promise<void>(resolve => { release = resolve; });
    mocks.historical.mockImplementationOnce(async () => { entered(); await waiting; return []; });
    const first = runControlledPatternHopResearch(input); await started;
    await expect(runControlledPatternHopResearch(input)).rejects.toThrow("pattern_hop_run_busy");
    expect(mocks.historical).toHaveBeenCalledTimes(1); release(); await first;
  });
  it("STOP during retrieval preserves the committed frontier and cannot be auto-resumed", async () => {
    mocks.historical.mockImplementation(async () => { await stopPatternHopRun({ ...input }); return []; });
    await expect(runControlledPatternHopResearch(input)).rejects.toThrow("pattern_hop_stop_requested");
    expect(commits).toEqual([]); expect(state.visited).toEqual([]); expect(state.frontier).toHaveLength(1);
    await expect(runControlledPatternHopResearch(input)).rejects.toThrow("pattern_hop_stop_requested");
  });
  it("refuses stale-worker checkpoint writes after lease expiry", async () => {
    mocks.historical.mockImplementation(async () => { expired = true; return []; });
    await expect(runControlledPatternHopResearch(input)).rejects.toThrow("pattern_hop_run_lease_lost");
    expect(commits).toEqual([]); expect(state.visited).toEqual([]);
  });
  it("missing control schema fails closed without a legacy write fallback", async () => {
    rpc.mockResolvedValueOnce({ data: null as never, error: new Error("RPC missing") as never });
    await expect(runControlledPatternHopResearch(input)).rejects.toThrow("RPC missing");
    expect(mocks.historical).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
});

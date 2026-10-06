import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PatternHopEdge, PatternHopEvidence, PatternHopState } from "@/lib/memory/patternHop";

const mocks = vi.hoisted(() => ({
  load: vi.fn(), create: vi.fn(), save: vi.fn(), evidence: vi.fn(), edges: vi.fn(),
  loadEvidence: vi.fn(), loadEdges: vi.fn(), historical: vi.fn(), memory: vi.fn(), timeline: vi.fn(),
}));
vi.mock("@/lib/memory/patternHopStore", () => ({
  loadPatternHopRun: mocks.load, createPatternHopRun: mocks.create, savePatternHopRun: mocks.save,
  persistPatternHopEvidence: mocks.evidence, persistPatternHopEdges: mocks.edges,
  loadPatternHopEvidence: mocks.loadEvidence, loadPatternHopEdges: mocks.loadEdges,
}));
vi.mock("@/lib/memory/patternHopRetrieval", () => ({
  searchHistoricalHopEvidence: mocks.historical, searchMemoryHopEvidence: mocks.memory,
  searchTimelineHopEvidence: mocks.timeline, classifyHistoricalEvidence: () => ({ evidenceType: "direct_user_statement", epistemicStatus: "direct" }),
}));
import { runPatternHopResearch } from "@/lib/memory/patternHopResearch";

const initial = (): PatternHopState => ({ objective: "trace agency", maxDepth: 2,
  frontier: [{ evidenceId: "seed", clue: "agency", depth: 0, branch: "direct_matches" }],
  visited: [], completedBranches: [], exhaustedBranches: [], status: "active" });
const input = { supabase: {} as any, userId: "owner", projectId: "project", seed: "agency", runId: "run", maxHops: 1 };
let durableState: PatternHopState;
let durableEvidence: PatternHopEvidence[];
let durableEdges: PatternHopEdge[];

beforeEach(() => {
  vi.resetAllMocks();
  durableState = initial(); durableEvidence = []; durableEdges = [];
  mocks.load.mockImplementation(async () => ({ id: "run", state: structuredClone(durableState), seed: { clue: "agency" } }));
  mocks.loadEvidence.mockImplementation(async () => structuredClone(durableEvidence));
  mocks.loadEdges.mockImplementation(async () => structuredClone(durableEdges));
  mocks.save.mockImplementation(async ({ state }) => { durableState = structuredClone(state); });
  mocks.evidence.mockImplementation(async ({ evidence }) => {
    for (const item of evidence) if (!durableEvidence.some(e => e.id === item.id)) durableEvidence.push(structuredClone(item));
    return new Map(evidence.map((e: PatternHopEvidence) => [e.id, e.id]));
  });
  mocks.edges.mockImplementation(async ({ edges }) => { durableEdges.push(...structuredClone(edges)); });
  mocks.historical.mockResolvedValue([{ id: "source-one", source: "chatgpt", sourceThreadId: "thread", sourceMessageId: "message", role: "user", content: "agency runtime implementation", similarity: 1 }]);
  mocks.memory.mockResolvedValue([]); mocks.timeline.mockResolvedValue([]);
});

describe("Pattern Hop durable checkpoint ordering", () => {
  it.each([{ seed: "different" }, { maxDepth: 3 }])("rejects resume inputs that would change saved traversal %j", async (changed) => {
    await expect(runPatternHopResearch({ ...input, ...changed })).rejects.toThrow("pattern_hop_resume_input_mismatch");
    expect(mocks.historical).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rebuilds child hops when both source and edge survived a failed checkpoint", async () => {
    mocks.save.mockRejectedValueOnce(new Error("checkpoint_store_unavailable"));
    await expect(runPatternHopResearch(input)).rejects.toThrow("checkpoint_store_unavailable");
    expect(durableState).toEqual(initial());
    expect(durableEdges).toHaveLength(1);
    const resumed = await runPatternHopResearch(input);
    expect(resumed.path).toHaveLength(1);
    expect(resumed.state.frontier).toHaveLength(10);
    expect(durableEdges).toHaveLength(1);
    expect(resumed.state.visited).toHaveLength(1);
  });
  it("recovers a source saved before its edge failed without losing or duplicating the hop", async () => {
    mocks.edges.mockRejectedValueOnce(new Error("edge_store_unavailable"));
    await expect(runPatternHopResearch(input)).rejects.toThrow("edge_store_unavailable");
    expect(durableState).toEqual(initial());
    expect(durableEvidence).toHaveLength(1);
    const resumed = await runPatternHopResearch(input);
    expect(resumed.evidence).toHaveLength(1);
    expect(resumed.path).toHaveLength(1);
    expect(resumed.state.frontier.every(item => item.evidenceId === "source-one")).toBe(true);
    expect(durableEdges).toHaveLength(1);
  });
  it("never advances the durable frontier when evidence saving fails", async () => {
    mocks.evidence.mockRejectedValueOnce(new Error("evidence_store_unavailable"));
    await expect(runPatternHopResearch(input)).rejects.toThrow("evidence_store_unavailable");
    expect(durableState).toEqual(initial());
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("saves sources and edges before every advanced checkpoint and resumes their trail", async () => {
    mocks.save.mockImplementationOnce(async ({ state }) => {
      expect(durableEvidence.map(e => e.id)).toContain("source-one");
      expect(durableEdges.some(e => e.toEvidenceId === "source-one")).toBe(true);
      durableState = structuredClone(state);
      throw new Error("interrupted_after_checkpoint_commit");
    });
    await expect(runPatternHopResearch(input)).rejects.toThrow("interrupted_after_checkpoint_commit");
    expect(durableState.visited).toHaveLength(1);
    mocks.historical.mockResolvedValue([]);
    const resumed = await runPatternHopResearch(input);
    expect(resumed.evidence.map(e => e.id)).toContain("source-one");
    expect(resumed.path.some(step => step.evidenceId === "source-one")).toBe(true);
    expect(resumed.state.visited).toHaveLength(2);
    expect(resumed.evidence[0].sourceMessageId).toBe("message");
  });
});

import {beforeEach,describe,expect,it,vi} from "vitest";
import type {PatternHopEdge,PatternHopEvidence,PatternHopState} from "@/lib/memory/patternHop";

const mocks=vi.hoisted(()=>({
  load:vi.fn(),create:vi.fn(),save:vi.fn(),evidence:vi.fn(),edges:vi.fn(),
  loadEvidence:vi.fn(),loadEdges:vi.fn(),historical:vi.fn(),memory:vi.fn(),timeline:vi.fn(),
}));
vi.mock("@/lib/memory/patternHopStore",()=>({
  loadPatternHopRun:mocks.load,createPatternHopRun:mocks.create,savePatternHopRun:mocks.save,
  persistPatternHopEvidence:mocks.evidence,persistPatternHopEdges:mocks.edges,
  loadPatternHopEvidence:mocks.loadEvidence,loadPatternHopEdges:mocks.loadEdges,
}));
vi.mock("@/lib/memory/patternHopRetrieval",()=>({
  searchHistoricalHopEvidence:mocks.historical,searchMemoryHopEvidence:mocks.memory,
  searchTimelineHopEvidence:mocks.timeline,
  classifyHistoricalEvidence:()=>({evidenceType:"direct_user_statement",epistemicStatus:"direct"}),
}));
import {runPatternHopResearch,type PatternHopRunControlPort} from "@/lib/memory/patternHopResearch";

const state=():PatternHopState=>({
  objective:"trace",maxDepth:2,
  frontier:[{evidenceId:"seed",clue:"agency",depth:0,branch:"direct_matches"}],
  visited:[],completedBranches:[],exhaustedBranches:[],status:"active",blocker:null,
});
const input={supabase:{} as any,userId:"owner",projectId:"project",seed:"agency",runId:"run",maxHops:1,workerId:"worker"};
const lease={workerId:"worker",leaseToken:"lease-token",leaseMs:90000};
let durable:PatternHopState;

function control():{
  port:PatternHopRunControlPort;
  claim:ReturnType<typeof vi.fn>;
  heartbeat:ReturnType<typeof vi.fn>;
  release:ReturnType<typeof vi.fn>;
}{
  const claim=vi.fn(async()=>({status:"claimed" as const,lease}));
  const heartbeat=vi.fn(async()=> "ok" as const);
  const release=vi.fn(async()=>{});
  return {claim,heartbeat,release,port:{claim:claim as any,heartbeat:heartbeat as any,release:release as any}};
}

beforeEach(()=>{
  vi.resetAllMocks();
  durable=state();
  mocks.load.mockResolvedValue({id:"run",state:structuredClone(durable),seed:{clue:"agency"}});
  mocks.loadEvidence.mockResolvedValue([]);
  mocks.loadEdges.mockResolvedValue([]);
  mocks.save.mockImplementation(async({state:s})=>{durable=structuredClone(s);});
  mocks.evidence.mockImplementation(async({evidence}:{evidence:PatternHopEvidence[]})=>
    new Map(evidence.map(e=>[e.id,e.id])));
  mocks.edges.mockImplementation(async()=>{});
  mocks.historical.mockResolvedValue([{id:"source",source:"chatgpt",role:"user",
    content:"agency evidence",similarity:1}]);
  mocks.memory.mockResolvedValue([]);
  mocks.timeline.mockResolvedValue([]);
});

describe("Pattern Hop traversal lease and durable STOP integration",()=>{
  it("does not start retrieval while another continuation owns the run",async()=>{
    const c=control();
    c.claim.mockResolvedValueOnce({status:"in_progress"});
    await expect(runPatternHopResearch({...input,runControl:c.port}))
      .rejects.toThrow("pattern_hop_run_in_progress");
    expect(mocks.historical).not.toHaveBeenCalled();
    expect(c.release).not.toHaveBeenCalled();
  });

  it("honors a durable STOP already present before traversal",async()=>{
    const c=control();
    c.claim.mockResolvedValueOnce({status:"stopped"});
    const result=await runPatternHopResearch({...input,runControl:c.port});
    expect(result.handoff.passStopReason).toBe("stop_requested");
    expect(result.state).toEqual(state());
    expect(mocks.historical).not.toHaveBeenCalled();
    expect(mocks.edges).not.toHaveBeenCalled();
    expect(c.release).not.toHaveBeenCalled();
  });

  it("does not persist retrieval advancement when STOP arrives after providers return",async()=>{
    const c=control();
    c.heartbeat
      .mockResolvedValueOnce("ok")
      .mockResolvedValue("stopped");
    const result=await runPatternHopResearch({...input,runControl:c.port});
    expect(mocks.historical).toHaveBeenCalledTimes(1);
    expect(result.handoff.passStopReason).toBe("stop_requested");
    expect(result.state.frontier).toEqual(state().frontier);
    expect(result.state.visited).toEqual([]);
    expect(mocks.evidence).not.toHaveBeenCalled();
    expect(mocks.edges).not.toHaveBeenCalled();
    expect(c.release).toHaveBeenCalledTimes(1);
  });

  it("releases the run lease on a controlled failure",async()=>{
    const c=control();
    c.heartbeat.mockRejectedValueOnce(new Error("pattern_hop_run_lease_lost"));
    await expect(runPatternHopResearch({...input,runControl:c.port}))
      .rejects.toThrow("lease_lost");
    expect(mocks.historical).not.toHaveBeenCalled();
    expect(c.release).toHaveBeenCalledTimes(1);
  });

  it("holds the lease through durable advancement then releases it",async()=>{
    const c=control();
    const result=await runPatternHopResearch({...input,runControl:c.port});
    expect(result.state.visited).toHaveLength(1);
    expect(mocks.evidence).toHaveBeenCalled();
    expect(mocks.edges).toHaveBeenCalled();
    expect(c.heartbeat.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.historical.mock.invocationCallOrder[0]);
    expect(c.release).toHaveBeenCalledTimes(1);
  });
});

import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({
  context:vi.fn(),owner:vi.fn(),enqueue:vi.fn(),load:vi.fn(),stop:vi.fn(),resume:vi.fn(),
}));
vi.mock("../context",()=>({arkMcpUserContext:mocks.context}));
vi.mock("@/lib/auth/ownership",()=>({assertProjectOwnedByUser:mocks.owner}));
vi.mock("@/lib/supabase/admin",()=>({supabaseAdmin:()=>({admin:true})}));
vi.mock("@/lib/ark/agencyBridge",()=>({enqueueArkAgencyToolPlan:mocks.enqueue}));
vi.mock("@/lib/memory/patternHopStore",async importOriginal=>({
  ...await importOriginal<object>(),loadPatternHopRun:mocks.load,
}));
vi.mock("@/lib/memory/patternHopRunControl",async importOriginal=>({
  ...await importOriginal<object>(),
  requestPatternHopStop:mocks.stop,resumePatternHopRun:mocks.resume,
}));
import {registerArkPatternHopTool} from "../registerArkPatternHopTool";
import {ARK_PATTERN_HOP_SUBMIT_PERMISSION} from "../taskPermissions";

const project="11111111-1111-4111-8111-111111111111";
const user="22222222-2222-4222-8222-222222222222";
const run="33333333-3333-4333-8333-333333333333";
const ctx={http:{authInfo:{token:"validated",clientId:"approved-client",
  scopes:["ark.read",ARK_PATTERN_HOP_SUBMIT_PERMISSION],
  extra:{userId:user,arkPatternHopProjectIds:[project]}}}};

function tools(){
  const registerTool=vi.fn();
  registerArkPatternHopTool({registerTool} as never);
  return new Map(registerTool.mock.calls.map(c=>[c[0],{config:c[1],run:c[2]}]));
}

beforeEach(()=>{
  vi.resetAllMocks();
  vi.stubEnv("ARBOR_ENABLE_ARK_MCP_SUBMISSION","true");
  vi.stubEnv("ARBOR_ENABLE_ARK_MCP_PATTERN_HOP","true");
  vi.stubEnv("ARBOR_ENABLE_PATTERN_HOP_RUN_CONTROL","true");
  mocks.context.mockReturnValue({userId:user,supabase:{user:true}});
  mocks.owner.mockResolvedValue(undefined);
  mocks.load.mockResolvedValue({id:run,userId:user,projectId:project,state:{status:"active"}});
  mocks.stop.mockResolvedValue("requested");
  mocks.resume.mockResolvedValue("resumed");
});

describe("Pattern Hop remote durable control",()=>{
  it("registers submit, STOP and resume only when the separate control gate is enabled",()=>{
    expect([...tools().keys()]).toEqual([
      "submit_ark_pattern_hop_pass","stop_ark_pattern_hop_run","resume_ark_pattern_hop_run",
    ]);
    vi.stubEnv("ARBOR_ENABLE_PATTERN_HOP_RUN_CONTROL","false");
    expect([...tools().keys()]).toEqual(["submit_ark_pattern_hop_pass"]);
  });
  it("durably stops only an owned run through the existing Pattern Hop grant",async()=>{
    const t=tools().get("stop_ark_pattern_hop_run")!;
    const result=await t.run({projectId:project,runId:run},ctx);
    expect(result.structuredContent).toEqual({projectId:project,runId:run,status:"requested",durable:true});
    expect(mocks.owner).toHaveBeenCalled();
    expect(mocks.load).toHaveBeenCalledWith({supabase:{user:true},userId:user,projectId:project,runId:run});
    expect(mocks.stop).toHaveBeenCalledWith({supabase:{user:true},userId:user,projectId:project,runId:run});
  });
  it("explicit resume clears the latch but executes no pass",async()=>{
    const t=tools().get("resume_ark_pattern_hop_run")!;
    const result=await t.run({projectId:project,runId:run},ctx);
    expect(result.structuredContent).toEqual({projectId:project,runId:run,status:"resumed",executed:false});
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it("rechecks the control gate after discovery",async()=>{
    const t=tools().get("stop_ark_pattern_hop_run")!;
    vi.stubEnv("ARBOR_ENABLE_PATTERN_HOP_RUN_CONTROL","false");
    await expect(t.run({projectId:project,runId:run},ctx)).rejects.toThrow("run_control_disabled");
    expect(mocks.stop).not.toHaveBeenCalled();
  });
  it("does not expose a foreign or missing run to the control RPC",async()=>{
    mocks.load.mockResolvedValue(null);
    await expect(tools().get("stop_ark_pattern_hop_run")!.run({projectId:project,runId:run},ctx))
      .rejects.toThrow("run_not_found");
    expect(mocks.stop).not.toHaveBeenCalled();
  });
});

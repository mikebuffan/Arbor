import {beforeEach, describe, expect, it, vi} from "vitest";
const mocks = vi.hoisted(() => ({context: vi.fn(), owner: vi.fn(), admin: vi.fn(), enqueue: vi.fn()}));
vi.mock("../context", () => ({arkMcpUserContext: mocks.context}));
vi.mock("@/lib/auth/ownership", () => ({assertProjectOwnedByUser: mocks.owner}));
vi.mock("@/lib/supabase/admin", () => ({supabaseAdmin: mocks.admin}));
vi.mock("@/lib/ark/agencyBridge", () => ({enqueueArkAgencyToolPlan: mocks.enqueue}));
import {registerArkPatternHopTool, ArkPatternHopRequest} from "../registerArkPatternHopTool";
import {ARK_PATTERN_HOP_SUBMIT_PERMISSION, arkPatternHopProjects} from "../taskPermissions";

const project = "11111111-1111-4111-8111-111111111111";
const user = "22222222-2222-4222-8222-222222222222";
const task = "33333333-3333-4333-8333-333333333333";
const objective = "44444444-4444-4444-8444-444444444444";
const request = "55555555-5555-4555-8555-555555555555";
const input = {projectId: project, requestId: request, seed: "agency continuity", runId: null, maxHops: 2, maxDepth: 2};
const ctx = {http: {authInfo: {token: "validated", clientId: "approved-client", scopes: ["ark.read",ARK_PATTERN_HOP_SUBMIT_PERMISSION], extra: {userId: user, arkPatternHopProjectIds: [project]}}}};
function registered(){const registerTool=vi.fn();registerArkPatternHopTool({registerTool} as never);return registerTool.mock.calls;}
function tool(){const call=registered()[0];if(!call)throw Error("missing tool");return {config:call[1],run:call[2]};}
function client(run: unknown = null, result: unknown = {id:task,user_id:user,project_id:project,status:"queued"}) {
  return {from: vi.fn((table:string) => {const q:any={};for(const n of ["select","eq"])q[n]=vi.fn(()=>q);q.maybeSingle=vi.fn(async()=>({data:table === "ark_tasks" ? result : run,error:null}));return q;})};
}
describe("bounded Pattern Hop MCP -> existing ARK agency queue",()=>{
 beforeEach(()=>{vi.resetAllMocks();vi.stubEnv("ARBOR_ENABLE_ARK_MCP_SUBMISSION","true");vi.stubEnv("ARBOR_ENABLE_ARK_MCP_PATTERN_HOP","true");vi.stubEnv("ARBOR_ENABLE_PATTERN_HOP_CONTROLS","true");mocks.owner.mockResolvedValue(undefined);mocks.admin.mockReturnValue({queue:"privileged"});mocks.enqueue.mockResolvedValue({id:objective,userId:user,projectId:project,status:"queued"});mocks.context.mockReturnValue({userId:user,supabase:client()});});
 it.each(["ARBOR_ENABLE_ARK_MCP_SUBMISSION","ARBOR_ENABLE_ARK_MCP_PATTERN_HOP","ARBOR_ENABLE_PATTERN_HOP_CONTROLS"])("stays absent with %s disabled",flag=>{vi.stubEnv(flag,"false");expect(registered()).toEqual([]);});
 it("rechecks the gate after discovery",async()=>{const t=tool();vi.stubEnv("ARBOR_ENABLE_ARK_MCP_PATTERN_HOP","false");await expect(t.run(input,ctx)).rejects.toThrow("disabled");expect(mocks.admin).not.toHaveBeenCalled();});
 it("never treats a read-task permission as Pattern Hop permission",async()=>{await expect(tool().run(input,{http:{authInfo:{...ctx.http.authInfo,scopes:["ark.read","ark.submit.read_tasks"]}}})).rejects.toThrow("not_granted");expect(mocks.admin).not.toHaveBeenCalled();});
 it("denies ungranted projects before acquiring the privileged client",async()=>{await expect(tool().run({...input,projectId:task},ctx)).rejects.toThrow("not_granted");expect(mocks.admin).not.toHaveBeenCalled();});
 it("checks owned project before acquiring the privileged client",async()=>{mocks.owner.mockRejectedValue(new Error("project_not_found"));await expect(tool().run(input,ctx)).rejects.toThrow("project_not_found");expect(mocks.admin).not.toHaveBeenCalled();});
 it.each([{maxHops:9},{maxDepth:4},{maxHops:1.5},{seed:" "},{capability:"deploy"},{arguments:{userId:"foreign"}}])("rejects unbounded or arbitrary input %j",extra=>{expect(ArkPatternHopRequest.safeParse({...input,...extra}).success).toBe(false);});
 it("queues only the existing bounded tool and returns queue state rather than completion",async()=>{const r=await tool().run(input,ctx);expect(r.structuredContent).toMatchObject({taskId:task,status:"queued",submitted:true,researchCompletionVerified:false});expect(tool().config.annotations.readOnlyHint).toBe(false);expect(mocks.enqueue).toHaveBeenCalledWith(expect.objectContaining({planId:`mcp-pattern-hop:${request}`,steps:[{id:"pattern-hop-1",description:"Trace owned historical evidence with provenance",capability:"arbor_pattern_hop_research",arguments:{seed:input.seed,objective:null,runId:null,maxDepth:2,maxHops:2},maxAttempts:1}]}));expect(mocks.owner.mock.invocationCallOrder[0]).toBeLessThan(mocks.admin.mock.invocationCallOrder[0]);});
 it("uses a stable request key on retry and preserves changed input for RPC conflict detection",async()=>{const t=tool();await t.run(input,ctx);await t.run({...input,seed:"different clue"},ctx);expect(mocks.enqueue.mock.calls[0][0].planId).toBe(mocks.enqueue.mock.calls[1][0].planId);expect(mocks.enqueue.mock.calls[1][0].steps[0].arguments.seed).toBe("different clue");});
 it("rejects foreign existing runs before enqueue",async()=>{mocks.context.mockReturnValue({userId:user,supabase:client({id:task,user_id:"foreign",project_id:project,seed:{clue:input.seed},max_depth:2})});await expect(tool().run({...input,runId:task},ctx)).rejects.toThrow("not_found");expect(mocks.admin).not.toHaveBeenCalled();});
 it.each([{seed:{clue:"different"},max_depth:2},{seed:{clue:input.seed},max_depth:3}])("rejects changed resume seed/depth %j",async fields=>{mocks.context.mockReturnValue({userId:user,supabase:client({id:task,user_id:user,project_id:project,...fields})});await expect(tool().run({...input,runId:task},ctx)).rejects.toThrow("resume_input_mismatch");expect(mocks.admin).not.toHaveBeenCalled();});
 it("passes the owned run ID without replacing its saved traversal",async()=>{mocks.context.mockReturnValue({userId:user,supabase:client({id:task,user_id:user,project_id:project,seed:{clue:input.seed},max_depth:2,status:"active"})});await tool().run({...input,runId:task},ctx);expect(mocks.enqueue.mock.calls[0][0].steps[0].arguments.runId).toBe(task);});
 it("allows same-request readback after traversal finished, leaving replay to the idempotent queue",async()=>{mocks.context.mockReturnValue({userId:user,supabase:client({id:task,user_id:user,project_id:project,seed:{clue:input.seed},max_depth:2,status:"complete"})});await tool().run({...input,runId:task},ctx);expect(mocks.enqueue).toHaveBeenCalledTimes(1);});
 it("requires reuse of the request ID after an uncertain readback",async()=>{mocks.context.mockReturnValue({userId:user,supabase:client(null,null)});await expect(tool().run(input,ctx)).rejects.toThrow("retry_same_request_id");});
 it("keeps Pattern Hop grants separate from ordinary read grants",()=>{const g={arbor_ark_mcp:{client_ids:["approved-client"],project_ids:[project],permissions:["ark.submit.read_tasks"]}};expect(arkPatternHopProjects(g,"approved-client")).toEqual([]);g.arbor_ark_mcp.permissions=[ARK_PATTERN_HOP_SUBMIT_PERMISSION];expect(arkPatternHopProjects(g,"approved-client")).toEqual([project]);expect(arkPatternHopProjects(g,"foreign-client")).toEqual([]);});
});

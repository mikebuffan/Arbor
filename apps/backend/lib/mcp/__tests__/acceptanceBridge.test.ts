import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ context: vi.fn(), owner: vi.fn(), admin: vi.fn(), enqueue: vi.fn() }));
vi.mock("../context", () => ({ arkMcpUserContext: mocks.context }));
vi.mock("@/lib/auth/ownership", () => ({ assertProjectOwnedByUser: mocks.owner }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: mocks.admin }));
vi.mock("@/lib/ark/supabaseStore", () => ({ SupabaseArkStore: class { enqueueObjective = mocks.enqueue; } }));
import { registerArkAcceptanceTools, ArkAcceptanceRequest } from "../registerArkAcceptanceTools";
import { arkAcceptanceProjects, ARK_ACCEPTANCE_SUBMIT_PERMISSION } from "../taskPermissions";
import { acceptanceContract, acceptanceCaseInput } from "../../ark/acceptanceContract";

const project = "11111111-1111-4111-8111-111111111111";
const user = "22222222-2222-4222-8222-222222222222";
const task = "33333333-3333-4333-8333-333333333333";
const objective = "44444444-4444-4444-8444-444444444444";
const requestId = "55555555-5555-4555-8555-555555555555";
const input = { projectId: project, requestId, caseId: "tired-familiarity" };
const ctx = { http: { authInfo: { clientId: "client", token: "validated", scopes: [ARK_ACCEPTANCE_SUBMIT_PERMISSION],
  extra: { userId: user, arkAcceptanceProjectIds: [project] } } } };
function tools() { const registerTool = vi.fn(); registerArkAcceptanceTools({ registerTool } as never); return registerTool.mock.calls; }
function tool() { const [name, config, run] = tools().find(c => c[0] === "start_ark_behavior_test")!; return { name, config, run }; }
function client(data: unknown) { const q: any = {}; for (const k of ["select", "eq"]) q[k] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => ({ data, error: null })); return { from: vi.fn(() => q) }; }

describe("bounded behavior-test MCP connection", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("ARBOR_ENABLE_ARK_MCP_ACCEPTANCE", "true");
    vi.stubEnv("ARBOR_ACCEPTANCE_CAMPAIGN", "canary1"); vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "a".repeat(40));
    vi.stubEnv("OPENAI_AGENCY_MODEL", "test-model"); vi.stubEnv("ARBOR_ACCEPTANCE_ALLOW_FULL_PACK", "false");
    mocks.owner.mockResolvedValue(undefined); mocks.admin.mockReturnValue({});
    mocks.enqueue.mockResolvedValue({ id: objective, userId: user, projectId: project });
    mocks.context.mockReturnValue({ userId: user, supabase: client({ id: task, user_id: user, project_id: project, status: "queued" }) }); });
  it("advertises no start control when disabled but retains owned result reads", () => {
    vi.stubEnv("ARBOR_ENABLE_ARK_MCP_ACCEPTANCE", "false"); expect(tools().map(c => c[0])).toEqual(["get_ark_behavior_test_result"]); });
  it("rejects arbitrary code, prompts, budgets and unknown cases", () => {
    for (const extra of [{ prompt: "do anything" }, { maxCalls: 9999 }, { caseId: "arbitrary" }, { code: "run()" }])
      expect(ArkAcceptanceRequest.safeParse({ ...input, ...extra }).success).toBe(false);
  });
  it("requires the separate acceptance grant, not merely read-task permission", async () => {
    await expect(tool().run(input, { http: { authInfo: { ...ctx.http.authInfo, scopes: ["ark.submit.read_tasks"] } } })).rejects.toThrow("not_granted");
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(arkAcceptanceProjects({ arbor_ark_mcp: { client_ids: ["client"], permissions: ["ark.submit.read_tasks"], project_ids: [project] } }, "client")).toEqual([]);
  });
  it("checks ownership before privileged enqueue and returns queued, not completed", async () => {
    const r = await tool().run(input, ctx);
    expect(r.structuredContent).toMatchObject({ taskId: task, objectiveId: objective, status: "queued", completed: false });
    expect(mocks.owner.mock.invocationCallOrder[0]).toBeLessThan(mocks.admin.mock.invocationCallOrder[0]);
    expect(mocks.enqueue.mock.calls[0][0].tasks[0]).toMatchObject({ kind: "arbor.behavior-acceptance", maxAttempts: 1 });
    expect(tool().config.annotations).toMatchObject({ readOnlyHint: false, openWorldHint: true });
  });
  it("new request IDs and retries preserve the same bounded campaign key and payload", async () => {
    await tool().run(input, ctx); await tool().run({ ...input, requestId: task }, ctx);
    expect(mocks.enqueue.mock.calls[0][0]).toEqual(mocks.enqueue.mock.calls[1][0]);
  });
  it("rechecks the enable flag at invocation after tool discovery", async () => {
    const { run } = tool(); vi.stubEnv("ARBOR_ENABLE_ARK_MCP_ACCEPTANCE", "false");
    await expect(run(input, ctx)).rejects.toThrow("disabled"); expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it("keeps the other seventeen cases unavailable until the server enables the pack", async () => {
    await expect(tool().run({ ...input, caseId: "bounded-workaround" }, ctx)).rejects.toThrow("case_not_enabled");
    expect(mocks.enqueue).not.toHaveBeenCalled();
    vi.stubEnv("ARBOR_ACCEPTANCE_ALLOW_FULL_PACK", "true");
    await tool().run({ ...input, caseId: "bounded-workaround" }, ctx);
    expect(mocks.enqueue).toHaveBeenCalledTimes(1);
  });
  it("does not include scoring rubrics in server-generated inference data", () => {
    const contract = acceptanceContract();
    const prepared = acceptanceCaseInput("tired-familiarity", contract.contractHash);
    expect(JSON.stringify(prepared)).not.toContain("rubric");
    expect(contract.config.baselineContext).toBe("");
    expect(contract.config.candidateContext).toContain("ARBOR PRESERVED PERSONALITY");
    expect(contract.config.maxCalls).toBe(12);
  });
  it("does not fabricate a task ID when durable readback is unavailable", async () => {
    mocks.context.mockReturnValue({ userId: user, supabase: client(null) });
    await expect(tool().run(input, ctx)).rejects.toThrow("retry_same_request_id");
  });
  it("rejects foreign projects or foreign readback without a completion receipt", async () => {
    await expect(tool().run({ ...input, projectId: task }, ctx)).rejects.toThrow("not_granted");
    mocks.context.mockReturnValue({ userId: user, supabase: client({ id: task, user_id: task, project_id: project }) });
    await expect(tool().run(input, ctx)).rejects.toThrow("retry_same_request_id");
  });
  it("reconstructs large owned capture JSON through chunks without executing work", async () => {
    const output = { transcript: "synthetic".repeat(4000) };
    mocks.context.mockReturnValue({ userId: user, supabase: client({ id: task, user_id: user, project_id: project,
      kind: "arbor.behavior-acceptance", status: "completed", result: output }) });
    const [, , read] = tools().find(c => c[0] === "get_ark_behavior_test_result")!;
    let offset = 0, encoded = "";
    let resultHash: string | undefined;
    do {
      const r = await read({ projectId: project, taskId: task, offset }, ctx);
      expect(r.structuredContent.status).toBe("completed");
      expect(r.structuredContent.resultSha256).toMatch(/^[a-f0-9]{64}$/);
      if (resultHash) expect(r.structuredContent.resultSha256).toBe(resultHash);
      resultHash = r.structuredContent.resultSha256;
      expect(r.structuredContent.resultJsonPart.length).toBeLessThanOrEqual(12000);
      encoded += r.structuredContent.resultJsonPart;
      if (r.structuredContent.nextOffset === null) break;
      offset = r.structuredContent.nextOffset;
    } while (offset < 50000);
    expect(JSON.parse(encoded)).toEqual(output); expect(mocks.admin).not.toHaveBeenCalled(); expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it("does not accept foreign or unrelated task captures", async () => {
    mocks.context.mockReturnValue({ userId: user, supabase: client({ id: task, user_id: user, project_id: project,
      kind: "another-task", status: "completed", result: {} }) });
    const [, , read] = tools().find(c => c[0] === "get_ark_behavior_test_result")!;
    await expect(read({ projectId: project, taskId: task, offset: 0 }, ctx)).rejects.toThrow("not_found");
  });
});

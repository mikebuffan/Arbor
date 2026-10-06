import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ context: vi.fn(), owner: vi.fn(), admin: vi.fn() }));
vi.mock("../context", () => ({ arkMcpUserContext: m.context }));
vi.mock("@/lib/auth/ownership", () => ({ assertProjectOwnedByUser: m.owner }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: m.admin }));
import { registerPatternHopStopTool } from "../registerPatternHopStopTool";
const project = "11111111-1111-4111-8111-111111111111", run = "22222222-2222-4222-8222-222222222222";
const ctx = { http: { authInfo: { scopes: ["ark.submit.pattern_hop"], extra: { arkPatternHopProjectIds: [project] } } } };
let q: any, rpc: any;
function tool() { const registerTool = vi.fn(); registerPatternHopStopTool({ registerTool } as never); return registerTool.mock.calls[0]?.[2]; }
beforeEach(() => {
 vi.clearAllMocks(); vi.stubEnv("ARBOR_ENABLE_PATTERN_HOP_CONTROLS", "true"); vi.stubEnv("ARBOR_ENABLE_ARK_MCP_SUBMISSION", "false");
 q = {}; for (const n of ["select", "eq"]) q[n] = vi.fn(() => q);
 q.maybeSingle = vi.fn(async () => ({ data: { id: run, user_id: "owner", project_id: project }, error: null }));
 m.context.mockReturnValue({ userId: "owner", supabase: { from: vi.fn(() => q) } });
 m.owner.mockResolvedValue(undefined); rpc = vi.fn(async () => ({ data: "stop_requested", error: null })); m.admin.mockReturnValue({ rpc });
});
describe("Pattern Hop STOP boundary", () => {
 it("stays available when submissions are off and returns the durable RPC receipt", async () => {
  const result = await tool()({ projectId: project, runId: run }, ctx);
  expect(result.structuredContent).toEqual({ runId: run, status: "stop_requested", checkpointPreserved: true });
  expect(rpc).toHaveBeenCalledWith("arbor_stop_pattern_hop_run", { p_user_id: "owner", p_project_id: project, p_run_id: run });
 });
 it("never acquires privilege with a read-only grant", async () => {
  await expect(tool()({ projectId: project, runId: run }, { http: { authInfo: { scopes: ["ark.read"], extra: {} } } })).rejects.toThrow("not_granted");
  expect(m.admin).not.toHaveBeenCalled();
 });
 it("rejects a foreign run before privilege", async () => {
  q.maybeSingle.mockResolvedValue({ data: { id: run, user_id: "other", project_id: project }, error: null });
  await expect(tool()({ projectId: project, runId: run }, ctx)).rejects.toThrow("not_found"); expect(m.admin).not.toHaveBeenCalled();
 });
 it("propagates a failed STOP save without a success receipt", async () => {
  rpc.mockResolvedValue({ data: null, error: new Error("unavailable") });
  await expect(tool()({ projectId: project, runId: run }, ctx)).rejects.toThrow("unavailable");
 });
});

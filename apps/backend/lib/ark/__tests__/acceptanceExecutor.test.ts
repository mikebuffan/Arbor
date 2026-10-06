import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ run: vi.fn(), claim: vi.fn(), complete: vi.fn(), create: vi.fn() }));
vi.mock("../../arbor/agency/acceptanceRunner", () => ({ runAcceptanceComparison: mocks.run }));
vi.mock("../../arbor/agency/idempotency", () => ({ claimAgencyOperation: mocks.claim, completeAgencyOperation: mocks.complete }));
vi.mock("../../providers/openai", () => ({ openai: { responses: { create: mocks.create } } }));
import { registerArkAcceptanceExecutor } from "../acceptanceExecutor";
import { ArkExecutorRegistry } from "../executorRegistry";
import { acceptanceContract, ACCEPTANCE_TASK_KIND } from "../acceptanceContract";
import type { ArkClaim } from "../types";

const userId = "22222222-2222-4222-8222-222222222222";
const projectId = "11111111-1111-4111-8111-111111111111";
function setup() {
  const q: any = {}; for (const k of ["select", "eq"]) q[k] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => ({ data: { id: projectId }, error: null }));
  q.insert = vi.fn(async () => ({ error: null }));
  const supabase = { from: vi.fn(() => q), auth: { admin: { getUserById: vi.fn(async () => ({ error: null,
    data: { user: { app_metadata: { arbor_ark_mcp: { client_ids: ["client"], project_ids: [projectId], permissions: ["ark.submit.behavior_acceptance"] } } } } })) } } };
  const registry = new ArkExecutorRegistry(); registerArkAcceptanceExecutor({ registry, supabase: supabase as never });
  const claim = { task: { id: "task", objectiveId: "objective", userId, projectId, idempotencyKey: "operation",
    payload: { caseId: "tired-familiarity", contractHash: acceptanceContract().contractHash, clientId: "client" } },
    objective: { id: "objective", userId, projectId } } as unknown as ArkClaim;
  const heartbeat = vi.fn(async () => {});
  return { supabase, q, claim, heartbeat, execute: registry.get(ACCEPTANCE_TASK_KIND)! };
}

describe("ARK acceptance executor boundaries (mock storage/provider)", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("ARBOR_ENABLE_ARK_MCP_ACCEPTANCE", "true");
    vi.stubEnv("ARBOR_ACCEPTANCE_CAMPAIGN", "canary1"); vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "a".repeat(40));
    vi.stubEnv("OPENAI_AGENCY_MODEL", "test-model"); vi.stubEnv("OPENAI_API_KEY", "offline-placeholder");
    vi.stubEnv("ARBOR_ACCEPTANCE_ALLOW_FULL_PACK", "false");
    mocks.claim.mockResolvedValue({ acquired: true, result: null }); mocks.complete.mockResolvedValue(undefined);
    mocks.run.mockResolvedValue({ pairs: [{}], failures: [], status: "captured; unscored" }); });
  it("blocks flag-off and changed contracts before claiming or calling the model", async () => {
    const s = setup(); vi.stubEnv("ARBOR_ENABLE_ARK_MCP_ACCEPTANCE", "false");
    expect((await s.execute(s)).status).toBe("blocked");
    vi.stubEnv("ARBOR_ENABLE_ARK_MCP_ACCEPTANCE", "true"); vi.stubEnv("ARBOR_ACCEPTANCE_CAMPAIGN", "changed");
    expect((await s.execute(s)).status).toBe("blocked"); expect(mocks.claim).not.toHaveBeenCalled();
  });
  it("rechecks current grants and ownership before paid execution", async () => {
    const s = setup(); s.supabase.auth.admin.getUserById.mockResolvedValue({ error: null, data: { user: { app_metadata: {} } } } as any);
    expect((await s.execute(s)).status).toBe("blocked"); expect(mocks.run).not.toHaveBeenCalled();
  });
  it("never replays an uncertain paid operation", async () => {
    const s = setup(); mocks.claim.mockResolvedValue({ acquired: false, result: null });
    expect(await s.execute(s)).toMatchObject({ status: "blocked", blocker: { kind: "operation_in_progress" } });
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("returns the stored completed operation without invoking generation again", async () => {
    const s = setup(); mocks.claim.mockResolvedValue({ acquired: false, result: { verified: true, output: "stored" } });
    expect(await s.execute(s)).toMatchObject({ status: "completed", result: { output: "stored" } });
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("persists capture before subsequent generation and completes capture only, not behavior judgment", async () => {
    const s = setup(); mocks.create.mockResolvedValue({ id: "provider" });
    mocks.run.mockImplementation(async (input: any) => {
      await input.record({ type: "model-request" });
      await input.createResponse({ model: "test-model", input: "Synthetic" });
      return { pairs: [{}], failures: [], status: "captured; unscored" };
    });
    const r = await s.execute(s);
    expect(r).toMatchObject({ status: "completed", result: { verified: true, verificationScope: expect.stringContaining("unscored") } });
    expect(s.q.insert).toHaveBeenCalledWith(expect.objectContaining({ objective_id: "objective", task_id: "task", event_type: "behavior_acceptance_capture" }));
    expect(s.q.insert.mock.invocationCallOrder[0]).toBeLessThan(mocks.create.mock.invocationCallOrder[0]);
    expect(mocks.create.mock.calls[0][1]).toMatchObject({ maxRetries: 0, timeout: expect.any(Number) });
    expect(mocks.complete).toHaveBeenCalledTimes(1);
  });
  it("capture failures and partial pairs are non-retryable and never promoted to completed", async () => {
    const s = setup(); mocks.run.mockResolvedValue({ pairs: [], failures: [{ code: "failure" }] });
    expect(await s.execute(s)).toMatchObject({ status: "failed", retryable: false });
    mocks.run.mockRejectedValue(new Error("private provider detail"));
    expect(await s.execute(s)).toMatchObject({ status: "failed", retryable: false });
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});

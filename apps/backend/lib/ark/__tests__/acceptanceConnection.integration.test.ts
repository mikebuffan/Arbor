import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), claim: vi.fn(), complete: vi.fn() }));
vi.mock("../../providers/openai", () => ({ openai: { responses: { create: mocks.create } } }));
vi.mock("../../arbor/agency/idempotency", () => ({ claimAgencyOperation: mocks.claim, completeAgencyOperation: mocks.complete }));
import { registerArkAcceptanceExecutor } from "../acceptanceExecutor";
import { ArkExecutorRegistry } from "../executorRegistry";
import { acceptanceContract, ACCEPTANCE_TASK_KIND } from "../acceptanceContract";
import type { ArkClaim } from "../types";

beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("ARBOR_ENABLE_ARK_MCP_ACCEPTANCE", "true");
  vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "a".repeat(40)); vi.stubEnv("ARBOR_ACCEPTANCE_CAMPAIGN", "integration-test-only");
  vi.stubEnv("OPENAI_AGENCY_MODEL", "test-model"); vi.stubEnv("OPENAI_API_KEY", "offline-placeholder");
  vi.stubEnv("ARBOR_ACCEPTANCE_ALLOW_FULL_PACK", "false");
  mocks.claim.mockResolvedValue({ acquired: true, result: null }); mocks.complete.mockResolvedValue(undefined);
});

it("connects the real ARK executor, acceptance runner, agent and verifier through a mock provider/storage boundary", async () => {
  const userId = "owner", projectId = "11111111-1111-4111-8111-111111111111";
  const captured: any[] = [];
  const q: any = {}; for (const k of ["select", "eq"]) q[k] = vi.fn(() => q);
  q.maybeSingle = async () => ({ data: { id: projectId }, error: null });
  q.insert = async (row: any) => { captured.push(row); return { error: null }; };
  const supabase = { from: () => q, auth: { admin: { getUserById: async () => ({ error: null, data: { user: {
    app_metadata: { arbor_ark_mcp: { client_ids: ["client"], project_ids: [projectId], permissions: ["ark.submit.behavior_acceptance"] } },
  } } }) } } };
  let count = 0;
  mocks.create.mockImplementation(async (request: any) => ({ id: `mock-only-${++count}`, model: "test-model", status: "completed", output: [], usage: null,
    output_text: String(request.instructions).includes("completion and behavioral-regression verifier")
      ? JSON.stringify({ complete: true, score: 1, unresolvedWork: [], evidence: [], strategyCorrection: null, behaviorViolations: [] })
      : `Mock reply ${count}` }));
  const registry = new ArkExecutorRegistry(); registerArkAcceptanceExecutor({ registry, supabase: supabase as never });
  const claim = { objective: { id: "objective", userId, projectId }, task: { id: "task", userId, projectId,
    idempotencyKey: "test-operation", payload: { caseId: "tired-familiarity", contractHash: acceptanceContract().contractHash, clientId: "client" } } } as unknown as ArkClaim;
  const r = await registry.get(ACCEPTANCE_TASK_KIND)!({ claim, heartbeat: async () => {} });
  expect(r.status).toBe("completed");
  expect(mocks.create).toHaveBeenCalledTimes(8);
  if (r.status !== "completed") throw new Error("test capture failed");
  const output = r.result as any;
  expect(output.output.pairs).toHaveLength(1);
  expect(output.output.pairs[0].A.judgments).toEqual([]);
  expect(output.output.pairs[0].B.judgments).toEqual([]);
  expect(captured.filter(row => row.payload.type === "model-request")).toHaveLength(8);
  expect(captured.filter(row => row.payload.type === "model-response")).toHaveLength(8);
  expect(mocks.complete).toHaveBeenCalledTimes(1);
  // This checks source wiring only. No mock capture is saved as live evidence.
});

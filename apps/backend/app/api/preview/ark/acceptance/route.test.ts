import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  supabase: {},
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => mocks.supabase,
}));

vi.mock("@/lib/ark/defaultWorker", () => ({
  runDefaultArkWorkerCycle: mocks.run,
}));

import { POST } from "@/app/api/preview/ark/acceptance/route";

const OBJECTIVE = "6d108079-1a82-48e4-ac78-cc226d0684e3";

function request(objective = OBJECTIVE) {
  return new Request("https://preview.test/api/preview/ark/acceptance", {
    method: "POST",
    headers: { "x-arbor-canary-objective": objective },
  });
}

describe("preview ARK acceptance trigger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.run.mockReset();
    process.env.VERCEL_ENV = "preview";
    process.env.ARBOR_ENABLE_ARK_PREVIEW_ACCEPTANCE = "true";
    process.env.ARBOR_ARK_CANARY_OBJECTIVE_ID = OBJECTIVE;
  });

  it("fails closed outside Preview", async () => {
    process.env.VERCEL_ENV = "production";
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("fails closed when the dedicated acceptance flag is disabled", async () => {
    process.env.ARBOR_ENABLE_ARK_PREVIEW_ACCEPTANCE = "false";
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("requires a valid configured canary", async () => {
    process.env.ARBOR_ARK_CANARY_OBJECTIVE_ID = "00000000-0000-0000-0000-000000000000";
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("rejects any objective other than the configured canary", async () => {
    const response = await POST(request("11111111-1111-4111-8111-111111111111"));
    expect(response.status).toBe(403);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("runs one worker task scoped to the exact configured objective", async () => {
    mocks.run.mockResolvedValue({ status: "completed", processed: 1 });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.run).toHaveBeenCalledTimes(1);
    expect(mocks.run).toHaveBeenCalledWith(expect.objectContaining({
      objectiveId: OBJECTIVE,
      maxTasks: 1,
      maxRuntimeMs: 20_000,
    }));
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      objectiveId: OBJECTIVE,
      status: "completed",
      processed: 1,
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  agency: vi.fn(({ registry }) => registry.register("arbor.agency-tool", vi.fn())),
  canary: vi.fn(({ registry }) => registry.register("ark.preview-checkpoint", vi.fn())),
  research: vi.fn(({ registry }) => registry.register("ark.preview-research", vi.fn())),
  run: vi.fn().mockResolvedValue({ status: "idle" }),
}));

vi.mock("@/lib/ark/agencyToolExecutor", () => ({ registerArkAgencyToolExecutor: mocks.agency }));
vi.mock("@/lib/ark/checkpointCanaryExecutor", () => ({ registerArkCheckpointCanaryExecutor: mocks.canary }));
vi.mock("@/lib/ark/previewResearchExecutor", () => ({ registerArkPreviewResearchExecutor: mocks.research }));
vi.mock("@/lib/ark/runner", () => ({ runArkWorkerCycle: mocks.run }));

import { runDefaultArkWorkerCycle } from "@/lib/ark/defaultWorker";

const OBJECTIVE = "11111111-1111-4111-8111-111111111111";

describe("default ARK worker executor isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("registers only the generic executor in ordinary agency mode", async () => {
    await runDefaultArkWorkerCycle({ supabase: {} as never, workerId: "w" });
    expect(mocks.agency).toHaveBeenCalledTimes(1);
    expect(mocks.canary).not.toHaveBeenCalled();
    expect(mocks.research).not.toHaveBeenCalled();
  });

  it("registers only research for the explicit pinned research mode", async () => {
    vi.stubEnv("ARBOR_ARK_PREVIEW_RESEARCH", "true");
    vi.stubEnv("ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT", "true");
    vi.stubEnv("ARBOR_ARK_CANARY_OBJECTIVE_ID", OBJECTIVE);
    await runDefaultArkWorkerCycle({
      supabase: {} as never,
      workerId: "w",
      objectiveId: OBJECTIVE,
      mode: "preview-research",
    });
    expect(mocks.research).toHaveBeenCalledTimes(1);
    expect(mocks.agency).not.toHaveBeenCalled();
    expect(mocks.canary).not.toHaveBeenCalled();
  });

  it("registers only the canary for the explicit pinned checkpoint mode", async () => {
    vi.stubEnv("ARBOR_ARK_PREVIEW_CHECKPOINT_CANARY", "true");
    vi.stubEnv("ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT", "true");
    vi.stubEnv("ARBOR_ARK_CANARY_OBJECTIVE_ID", OBJECTIVE);
    await runDefaultArkWorkerCycle({
      supabase: {} as never,
      workerId: "w",
      objectiveId: OBJECTIVE,
      mode: "preview-checkpoint",
    });
    expect(mocks.canary).toHaveBeenCalledTimes(1);
    expect(mocks.agency).not.toHaveBeenCalled();
    expect(mocks.research).not.toHaveBeenCalled();
  });
});

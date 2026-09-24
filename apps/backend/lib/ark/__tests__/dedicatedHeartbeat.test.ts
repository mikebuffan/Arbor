import { describe, expect, it, vi } from "vitest";
import { runDedicatedArkHeartbeat } from "@/lib/ark/dedicatedHeartbeat";

const OBJECTIVE = "11111111-1111-4111-8111-111111111111";
const valid = {
  ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT: "true",
  ARBOR_ARK_ENABLE_LIVE_EXECUTION: "true",
  ARBOR_ENABLE_ARK_EXECUTION: "true",
  ARBOR_ARK_CANARY_OBJECTIVE_ID: OBJECTIVE,
};

describe("dedicated ARK heartbeat is explicitly scoped and bounded", () => {
  it("defaults OFF without invoking a worker", async () => {
    const runCycle = vi.fn();
    expect(await runDedicatedArkHeartbeat({ flags: {}, workerId: "w", runCycle }))
      .toMatchObject({ status: "skipped", reason: "ark_dedicated_disabled" });
    expect(runCycle).not.toHaveBeenCalled();
  });

  it("requires both existing live-execution flags", async () => {
    const runCycle = vi.fn();
    const result = await runDedicatedArkHeartbeat({
      flags: { ...valid, ARBOR_ENABLE_ARK_EXECUTION: "false" },
      workerId: "w", runCycle,
    });
    expect(result).toMatchObject({ status: "skipped", reason: "ark_execution_disabled" });
    expect(runCycle).not.toHaveBeenCalled();
  });

  it("requires a valid pinned objective despite global permission", async () => {
    const runCycle = vi.fn();
    const flags = { ...valid, ARBOR_ARK_CANARY_OBJECTIVE_ID: "invalid", ARBOR_ARK_ALLOW_GLOBAL_EXECUTION: "true" };
    expect(await runDedicatedArkHeartbeat({ flags, workerId: "w", runCycle }))
      .toMatchObject({ status: "skipped", reason: "ark_invalid_canary_objective_id" });
    expect(runCycle).not.toHaveBeenCalled();
  });

  it("never treats global permission as an excuse to omit a pinned objective", async () => {
    const runCycle = vi.fn();
    const flags = { ...valid, ARBOR_ARK_CANARY_OBJECTIVE_ID: "", ARBOR_ARK_ALLOW_GLOBAL_EXECUTION: "true" };
    expect(await runDedicatedArkHeartbeat({ flags, workerId: "w", runCycle }))
      .toMatchObject({ status: "skipped", reason: "ark_canary_objective_required" });
    expect(runCycle).not.toHaveBeenCalled();
  });

  it("invokes a specific objective with strict task and time limits", async () => {
    const runCycle = vi.fn().mockResolvedValue({ status: "idle", claimed: 0 });
    const result = await runDedicatedArkHeartbeat({ flags: valid, workerId: "w", runCycle });
    expect(result).toMatchObject({ status: "invoked", objectiveId: OBJECTIVE });
    expect(runCycle).toHaveBeenCalledExactlyOnceWith({
      objectiveId: OBJECTIVE, workerId: "w", maxTasks: 2, maxRuntimeMs: 10_000,
    });
  });

  it("propagates worker errors instead of claiming completion", async () => {
    const runCycle = vi.fn().mockRejectedValue(new Error("db unavailable"));
    await expect(runDedicatedArkHeartbeat({ flags: valid, workerId: "w", runCycle }))
      .rejects.toThrow("db unavailable");
  });
});

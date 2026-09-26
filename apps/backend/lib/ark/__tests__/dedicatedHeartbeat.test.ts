import { describe, expect, it, vi } from "vitest";
import { runDedicatedArkHeartbeat } from "@/lib/ark/dedicatedHeartbeat";

const OBJECTIVE = "11111111-1111-4111-8111-111111111111";
const valid = {
  ARBOR_ARK_ENABLE_DEDICATED_HEARTBEAT: "true",
  ARBOR_ARK_ENABLE_LIVE_EXECUTION: "true",
  ARBOR_ENABLE_ARK_EXECUTION: "true",
  ARBOR_ARK_CANARY_OBJECTIVE_ID: OBJECTIVE,
  SUPABASE_URL: "https://tzbpjbhroxiqftqwatnb.supabase.co",
  ARK_PREVIEW_WORKER_ONLY_HOST: "true",
  VERCEL_ENV: "preview",
  VERCEL_PROJECT_ID: "prj_OHM6b4QpfGZGNWpx4hSPkgHCuyzp",
  VERCEL_GIT_COMMIT_REF: "feature/ark-mcp-reader-execution-deny-20260926",
};

describe("dedicated ARK heartbeat is explicitly scoped and bounded", () => {
  it("defaults OFF without invoking a worker", async () => {
    const runCycle = vi.fn();
    expect(await runDedicatedArkHeartbeat({ flags: {}, workerId: "w", runCycle }))
      .toMatchObject({ status: "skipped", reason: "ark_dedicated_disabled" });
    expect(runCycle).not.toHaveBeenCalled();
  });

  it("never runs work on a read-only MCP host even with all execution flags set", async () => {
    const runCycle = vi.fn();
    const result = await runDedicatedArkHeartbeat({
      flags: { ...valid, ARK_PREVIEW_MCP_READONLY_HOST: "true" },
      workerId: "reader-host", runCycle,
    });
    expect(result).toEqual({ status: "skipped", reason: "ark_readonly_mcp_host" });
    expect(runCycle).not.toHaveBeenCalled();
  });

  it.each([
    { ARK_PREVIEW_WORKER_ONLY_HOST: "false" },
    { ARK_PREVIEW_WORKER_ONLY_HOST: undefined },
    { VERCEL_ENV: "production" },
    { VERCEL_ENV: undefined },
    { VERCEL_PROJECT_ID: "prj_JArYlugmdFovY10CxZ0LEJmcrsKC" },
    { VERCEL_PROJECT_ID: undefined },
    { VERCEL_GIT_COMMIT_REF: "main" },
    { VERCEL_GIT_COMMIT_REF: undefined },
  ])("rejects a non-worker environment without calling the worker: %o", async (change) => {
    const runCycle = vi.fn();
    const result = await runDedicatedArkHeartbeat({ flags: { ...valid, ...change }, workerId: "w", runCycle });
    expect(result).toEqual({ status: "skipped", reason: "ark_worker_host_required" });
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

  it("fails closed if the Preview URL is missing even with all execution switches on", async () => {
    const runCycle = vi.fn();
    const { SUPABASE_URL: _url, ...flags } = valid;
    expect(await runDedicatedArkHeartbeat({ flags, workerId: "w", runCycle }))
      .toMatchObject({ status: "skipped", reason: "ark_preview_database_required" });
    expect(runCycle).not.toHaveBeenCalled();
  });

  it("rejects Firefly, Grove, and lookalike database hosts", async () => {
    const runCycle = vi.fn();
    for (const url of [
      "https://ncpdlyakrzfvobmwzbon.supabase.co",
      "https://fqjqpuaoifgbweiguacf.supabase.co",
      "https://tzbpjbhroxiqftqwatnb.supabase.co.evil.example",
      "http://tzbpjbhroxiqftqwatnb.supabase.co",
      "https://tzbpjbhroxiqftqwatnb.supabase.co/other-path",
      "garbage",
    ]) {
      const result = await runDedicatedArkHeartbeat({
        flags: { ...valid, SUPABASE_URL: url },
        workerId: "w",
        runCycle,
      });
      expect(result).toMatchObject({
        status: "skipped", reason: "ark_preview_database_required",
      });
    }
    expect(runCycle).not.toHaveBeenCalled();
  });

  it("rejects conflicting admin and client database configuration", async () => {
    const runCycle = vi.fn();
    expect(await runDedicatedArkHeartbeat({
      flags: {
        ...valid,
        NEXT_PUBLIC_SUPABASE_URL: "https://ncpdlyakrzfvobmwzbon.supabase.co",
      },
      workerId: "w", runCycle,
    })).toMatchObject({
      status: "skipped", reason: "ark_preview_database_required",
    });
    expect(runCycle).not.toHaveBeenCalled();
  });

  it("accepts the preview public URL fallback when no admin URL is present", async () => {
    const runCycle = vi.fn().mockResolvedValue({ status: "idle" });
    const { SUPABASE_URL: _url, ...flags } = valid;
    expect(await runDedicatedArkHeartbeat({
      flags: {
        ...flags,
        NEXT_PUBLIC_SUPABASE_URL: "https://tzbpjbhroxiqftqwatnb.supabase.co",
      },
      workerId: "w", runCycle,
    })).toMatchObject({ status: "invoked", objectiveId: OBJECTIVE });
    expect(runCycle).toHaveBeenCalledTimes(1);
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

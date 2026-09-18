import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  execute: vi.fn(),
  claimOperation: vi.fn(),
  completeOperation: vi.fn(),
}));

vi.mock("@/lib/arbor/agency/arborTools", () => ({
  buildArborAgencyTools: () => ({ get: mocks.get }),
}));

vi.mock("@/lib/arbor/agency/toolExecution", () => ({
  executeAgencyToolWithRecovery: mocks.execute,
}));

vi.mock("@/lib/arbor/agency/idempotency", () => ({
  claimAgencyOperation: mocks.claimOperation,
  completeAgencyOperation: mocks.completeOperation,
}));

import { registerArkAgencyToolExecutor } from "../agencyToolExecutor";
import { ArkExecutorRegistry } from "../executorRegistry";
import type { ArkClaim } from "../types";

function claim(capability: string): ArkClaim {
  const now = "2026-09-18T14:30:00.000Z";
  return {
    objective: {
      id: "objective-1",
      userId: "user-1",
      projectId: "project-1",
      goal: "work",
      status: "running",
      priority: 0,
      budget: { maxTasksPerCycle: 8, maxRuntimeMs: 25_000, maxAttemptsPerTask: 3 },
      blocker: null,
      completionEvidence: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    task: {
      id: "task-1",
      objectiveId: "objective-1",
      userId: "user-1",
      projectId: "project-1",
      taskKey: "step-1",
      kind: "arbor.agency-tool",
      description: "run tool",
      status: "running",
      dependencies: [],
      payload: { capability, arguments: {}, turnId: "turn-1" },
      result: null,
      attemptCount: 1,
      maxAttempts: 3,
      idempotencyKey: "task-1",
      availableAt: now,
      leaseOwner: "worker-1",
      leaseToken: "lease-1",
      leaseExpiresAt: now,
      heartbeatAt: now,
      checkpointSequence: 0,
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
  };
}

describe("ARK Arbor tool boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.claimOperation.mockResolvedValue({ acquired: true, result: null });
    mocks.completeOperation.mockResolvedValue(undefined);
  });

  it("blocks an unknown capability without retrying execution", async () => {
    mocks.get.mockImplementation(() => {
      throw new Error("agency_tool_unknown:missing.tool");
    });
    const registry = new ArkExecutorRegistry();
    registerArkAgencyToolExecutor({ registry, supabase: {} as never });

    const result = await registry.get("arbor.agency-tool")!({
      claim: claim("missing.tool"),
      heartbeat: vi.fn(),
    });

    expect(result).toMatchObject({
      status: "blocked",
      blocker: { kind: "unsupported_capability" },
    });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("replays a completed reversible-write result without executing the tool again", async () => {
    mocks.get.mockReturnValue({
      name: "write.tool",
      description: "write",
      parameters: {},
      risk: "reversible_write",
      execute: vi.fn(),
    });
    mocks.claimOperation.mockResolvedValue({
      acquired: false,
      result: { persisted: true },
    });
    const registry = new ArkExecutorRegistry();
    registerArkAgencyToolExecutor({ registry, supabase: {} as never });

    const result = await registry.get("arbor.agency-tool")!({
      claim: claim("write.tool"),
      heartbeat: vi.fn(),
    });

    expect(result).toMatchObject({
      status: "completed",
      result: { replayed: true, output: { persisted: true } },
    });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("blocks an unfinished reversible-write claim instead of replaying its side effect", async () => {
    mocks.get.mockReturnValue({
      name: "write.tool",
      description: "write",
      parameters: {},
      risk: "reversible_write",
      execute: vi.fn(),
    });
    mocks.claimOperation.mockResolvedValue({ acquired: false, result: null });
    const registry = new ArkExecutorRegistry();
    registerArkAgencyToolExecutor({ registry, supabase: {} as never });

    const result = await registry.get("arbor.agency-tool")!({
      claim: claim("write.tool"),
      heartbeat: vi.fn(),
    });

    expect(result).toMatchObject({
      status: "blocked",
      blocker: { kind: "operation_in_progress" },
    });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("does not turn an ambiguous reversible-write failure into an ARK retry", async () => {
    mocks.get.mockReturnValue({
      name: "write.tool",
      description: "write",
      parameters: {},
      risk: "reversible_write",
      execute: vi.fn(),
    });
    mocks.execute.mockResolvedValue({
      ok: false,
      failure: {
        kind: "provider_failure",
        error: "provider failed after request",
        retryable: false,
        alternateRoutes: [],
        evidence: { capability: "write.tool", attempt: 1 },
      },
      recovery: { kind: "block", reason: "provider failed after request" },
      attempts: 1,
      recoveredFailures: [],
    });
    const registry = new ArkExecutorRegistry();
    registerArkAgencyToolExecutor({ registry, supabase: {} as never });

    const result = await registry.get("arbor.agency-tool")!({
      claim: claim("write.tool"),
      heartbeat: vi.fn(),
    });

    expect(result).toMatchObject({
      status: "failed",
      retryable: false,
    });
    expect(mocks.execute).toHaveBeenCalledTimes(1);
  });

  it("blocks a high-consequence tool before execution", async () => {
    mocks.get.mockReturnValue({
      name: "dangerous.tool",
      description: "danger",
      parameters: {},
      risk: "high_consequence",
      execute: vi.fn(),
    });
    const registry = new ArkExecutorRegistry();
    registerArkAgencyToolExecutor({ registry, supabase: {} as never });

    const result = await registry.get("arbor.agency-tool")!({
      claim: claim("dangerous.tool"),
      heartbeat: vi.fn(),
    });

    expect(result).toMatchObject({
      status: "blocked",
      blocker: { kind: "high_consequence_fork" },
    });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});

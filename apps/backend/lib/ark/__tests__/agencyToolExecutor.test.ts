import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("@/lib/arbor/agency/arborTools", () => ({
  buildArborAgencyTools: () => ({ get: mocks.get }),
}));

vi.mock("@/lib/arbor/agency/toolExecution", () => ({
  executeAgencyToolWithRecovery: mocks.execute,
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

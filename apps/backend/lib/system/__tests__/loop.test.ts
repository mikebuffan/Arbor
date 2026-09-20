import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  supabaseAdmin: vi.fn(),
  runMemoryDecay: vi.fn(),
  runReflectionJob: vi.fn(),
  runMemorySync: vi.fn(),
  runDefaultArkWorkerCycle: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

vi.mock("@/lib/tasks/decay", () => ({
  runMemoryDecay: mocks.runMemoryDecay,
}));

vi.mock("@/lib/tasks/reflection", () => ({
  runReflectionJob: mocks.runReflectionJob,
}));

vi.mock("@/lib/tasks/sync", () => ({
  runMemorySync: mocks.runMemorySync,
}));

vi.mock("@/lib/ark/defaultWorker", () => ({
  runDefaultArkWorkerCycle: mocks.runDefaultArkWorkerCycle,
}));

import { fireflyHeartbeat } from "@/lib/system/loop";

type ClientOptions = {
  lock?: Record<string, unknown> | null;
  lockReadError?: Error | null;
  lockWriteError?: Error | null;
  releaseError?: Error | null;
  heartbeatError?: Error | null;
  projects?: Array<{ id: string }>;
  projectsError?: Error | null;
};

function createClient(options: ClientOptions = {}) {
  const calls = {
    tables: [] as string[],
    lockSelect: "",
    lockUpsert: null as Record<string, unknown> | null,
    lockUpdate: null as Record<string, unknown> | null,
    heartbeats: [] as Array<Record<string, unknown>>,
  };
  let lockUse = 0;

  const client = {
    from: vi.fn((table: string) => {
      calls.tables.push(table);

      if (table === "system_locks") {
        lockUse += 1;
        if (lockUse === 1) {
          return {
            select: vi.fn((columns: string) => {
              calls.lockSelect = columns;
              return {
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: options.lock ?? null,
                    error: options.lockReadError ?? null,
                  }),
                })),
              };
            }),
          };
        }

        if (lockUse === 2) {
          return {
            upsert: vi.fn(
              async (row: Record<string, unknown>) => {
                calls.lockUpsert = row;
                return { error: options.lockWriteError ?? null };
              },
            ),
          };
        }

        return {
          update: vi.fn((row: Record<string, unknown>) => {
            calls.lockUpdate = row;
            const terminal = {
              error: options.releaseError ?? null,
            };
            const thirdEq = vi.fn().mockResolvedValue(terminal);
            const secondEq = vi.fn(() => ({
              eq: thirdEq,
            }));
            return {
              eq: vi.fn(() => ({
                eq: secondEq,
              })),
            };
          }),
        };
      }

      if (table === "projects") {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({
                data: options.projects ?? [],
                error: options.projectsError ?? null,
              }),
            })),
          })),
        };
      }

      if (table === "system_heartbeats") {
        return {
          insert: vi.fn(async (row: Record<string, unknown>) => {
            calls.heartbeats.push(row);
            return { error: options.heartbeatError ?? null };
          }),
        };
      }

      throw new Error(`unexpected table: ${table}`);
    }),
  };

  return { client, calls };
}

describe("fireflyHeartbeat live-schema alignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ARBOR_ENABLE_ARK_EXECUTION = "true";
    process.env.ARBOR_ARK_CANARY_OBJECTIVE_ID =
      "11111111-1111-4111-8111-111111111111";
    delete process.env.ARBOR_ARK_ALLOW_GLOBAL_EXECUTION;
    mocks.runMemoryDecay.mockResolvedValue({
      status: "skipped",
      reason: "memory_decay_schema_unavailable",
      processed: 0,
    });
    mocks.runReflectionJob.mockResolvedValue({
      status: "skipped",
      reason: "memory_reflections_table_absent",
      processed: 0,
    });
    mocks.runMemorySync.mockResolvedValue({
      status: "completed",
      processed: 2,
    });
    mocks.runDefaultArkWorkerCycle.mockResolvedValue({
      status: "idle",
      claimed: 0,
      completed: 0,
      checkpointed: 0,
      blocked: 0,
      failed: 0,
      verifiedObjectives: 0,
    });
  });

  it("uses live lock columns, avoids a user scan, and reports optional skips", async () => {
    const { client, calls } = createClient({
      projects: [{ id: "project-1" }, { id: "project-2" }],
    });
    mocks.supabaseAdmin.mockReturnValue(client);

    const result = await fireflyHeartbeat();

    expect(calls.lockSelect).toBe(
      "id, name, locked_at, released_at, is_active",
    );
    expect(calls.lockUpsert).toMatchObject({
      name: "firefly_heartbeat",
      released_at: null,
      is_active: true,
    });
    expect(calls.lockUpdate).toMatchObject({
      is_active: false,
    });
    expect(calls.tables).not.toContain("users");
    expect(calls.tables).not.toContain("app_users");
    expect(mocks.runMemorySync).toHaveBeenCalledTimes(2);
    expect(mocks.runDefaultArkWorkerCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase: client,
        maxTasks: 8,
        maxRuntimeMs: 15_000,
        objectiveId: "11111111-1111-4111-8111-111111111111",
      }),
    );
    expect(result).toMatchObject({
      status: "completed",
      processedProjects: 2,
      syncedMemories: 4,
      tasks: {
        decay: { status: "skipped" },
        reflection: { status: "skipped" },
        sync: { status: "completed" },
        ark: { status: "idle" },
      },
    });
    expect(calls.heartbeats).toHaveLength(1);
    expect(calls.heartbeats[0]).toMatchObject({
      status: "completed",
      processed_users: 0,
    });
  });

  it("keeps ARK fully disabled unless the execution flag is explicitly enabled", async () => {
    delete process.env.ARBOR_ENABLE_ARK_EXECUTION;
    const { client } = createClient({
      projects: [{ id: "project-1" }],
    });
    mocks.supabaseAdmin.mockReturnValue(client);

    const result = await fireflyHeartbeat();

    expect(mocks.runDefaultArkWorkerCycle).not.toHaveBeenCalled();
    expect(result.tasks.ark).toMatchObject({
      status: "skipped",
      reason: "ark_execution_disabled",
    });
  });

  it("does not start an unscoped worker from the execution flag alone", async () => {
    delete process.env.ARBOR_ARK_CANARY_OBJECTIVE_ID;
    const { client } = createClient();
    mocks.supabaseAdmin.mockReturnValue(client);

    const result = await fireflyHeartbeat();

    expect(mocks.runDefaultArkWorkerCycle).not.toHaveBeenCalled();
    expect(result.tasks.ark).toMatchObject({
      status: "skipped",
      reason: "ark_canary_objective_required",
    });
  });

  it("rejects an invalid canary ID even when global execution is enabled", async () => {
    process.env.ARBOR_ARK_CANARY_OBJECTIVE_ID = "not-a-real-objective";
    process.env.ARBOR_ARK_ALLOW_GLOBAL_EXECUTION = "true";
    const { client } = createClient();
    mocks.supabaseAdmin.mockReturnValue(client);

    const result = await fireflyHeartbeat();

    expect(mocks.runDefaultArkWorkerCycle).not.toHaveBeenCalled();
    expect(result.tasks.ark).toMatchObject({
      status: "skipped",
      reason: "ark_invalid_canary_objective_id",
    });
  });

  it("scopes a canary even when global authorization is present", async () => {
    process.env.ARBOR_ARK_ALLOW_GLOBAL_EXECUTION = "true";
    const { client } = createClient();
    mocks.supabaseAdmin.mockReturnValue(client);

    await fireflyHeartbeat();

    expect(mocks.runDefaultArkWorkerCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        objectiveId: "11111111-1111-4111-8111-111111111111",
      }),
    );
  });

  it("runs an unscoped worker only after separate global authorization", async () => {
    delete process.env.ARBOR_ARK_CANARY_OBJECTIVE_ID;
    process.env.ARBOR_ARK_ALLOW_GLOBAL_EXECUTION = "true";
    const { client } = createClient();
    mocks.supabaseAdmin.mockReturnValue(client);

    await fireflyHeartbeat();

    expect(mocks.runDefaultArkWorkerCycle).toHaveBeenCalledWith(
      expect.not.objectContaining({ objectiveId: expect.anything() }),
    );
  });

  it("reports an active lock as a safe skip without running tasks", async () => {
    const { client, calls } = createClient({
      lock: {
        id: "lock-1",
        name: "firefly_heartbeat",
        locked_at: new Date().toISOString(),
        released_at: null,
        is_active: true,
      },
    });
    mocks.supabaseAdmin.mockReturnValue(client);

    const result = await fireflyHeartbeat();

    expect(result.status).toBe("skipped");
    expect(result.tasks.sync).toMatchObject({
      status: "skipped",
      reason: "active_heartbeat_lock",
    });
    expect(mocks.runMemoryDecay).not.toHaveBeenCalled();
    expect(mocks.runMemorySync).not.toHaveBeenCalled();
    expect(mocks.runDefaultArkWorkerCycle).not.toHaveBeenCalled();
    expect(calls.heartbeats[0]).toMatchObject({
      status: "skipped",
      processed_users: 0,
    });
  });

  it("propagates required task failures and still releases the lock", async () => {
    const { client, calls } = createClient({
      projects: [{ id: "project-1" }],
    });
    mocks.supabaseAdmin.mockReturnValue(client);
    mocks.runMemorySync.mockRejectedValue(new Error("sync failed"));

    await expect(fireflyHeartbeat()).rejects.toThrow("sync failed");

    expect(calls.lockUpdate).toMatchObject({ is_active: false });
    expect(calls.heartbeats).toContainEqual(
      expect.objectContaining({
        status: "failed",
        processed_users: 0,
      }),
    );
    expect(calls.heartbeats).not.toContainEqual(
      expect.objectContaining({ status: "completed" }),
    );
  });

  it("does not turn a database failure into apparent success", async () => {
    const { client, calls } = createClient({
      projectsError: new Error("project query failed"),
    });
    mocks.supabaseAdmin.mockReturnValue(client);

    await expect(fireflyHeartbeat()).rejects.toThrow("project query failed");
    expect(calls.heartbeats).not.toContainEqual(
      expect.objectContaining({ status: "completed" }),
    );
  });

  it("does not hide an ARK continuation failure", async () => {
    const { client, calls } = createClient();
    mocks.supabaseAdmin.mockReturnValue(client);
    mocks.runDefaultArkWorkerCycle.mockRejectedValue(
      new Error("ark continuation failed"),
    );

    await expect(fireflyHeartbeat()).rejects.toThrow(
      "ark continuation failed",
    );
    expect(calls.lockUpdate).toMatchObject({ is_active: false });
    expect(calls.heartbeats).not.toContainEqual(
      expect.objectContaining({ status: "completed" }),
    );
  });
});

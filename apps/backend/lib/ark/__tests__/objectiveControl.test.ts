import { describe, expect, it, vi } from "vitest";
import { SupabaseArkStore } from "../supabaseStore";

const ROW = {
  id: "00000000-0000-4000-8000-000000000001",
  user_id: "00000000-0000-4000-8000-000000000002",
  project_id: "00000000-0000-4000-8000-000000000003",
  goal: "bounded objective",
  status: "cancelled",
  priority: 0,
  budget: {
    maxTasksPerCycle: 8,
    maxRuntimeMs: 25000,
    maxAttemptsPerTask: 3,
  },
  blocker: { kind: "cancelled" },
  completion_evidence: null,
  version: 4,
  created_at: "2026-10-06T00:00:00.000Z",
  updated_at: "2026-10-06T00:01:00.000Z",
};

describe("SupabaseArkStore objective controls", () => {
  it("uses the protected STOP RPC and returns the durable cancelled objective", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: ROW, error: null });
    const store = new SupabaseArkStore({ rpc } as never);

    const result = await store.cancelObjective({
      objectiveId: ROW.id,
      now: "2026-10-06T00:01:00.000Z",
    });

    expect(rpc).toHaveBeenCalledWith("ark_cancel_objective", {
      p_objective_id: ROW.id,
      p_now: "2026-10-06T00:01:00.000Z",
    });
    expect(result).toMatchObject({
      id: ROW.id,
      status: "cancelled",
      blocker: { kind: "cancelled" },
    });
  });

  it("uses the bounded blocked-resume RPC without inventing a new objective", async () => {
    const queued = {
      ...ROW,
      status: "queued",
      blocker: null,
      version: 5,
      updated_at: "2026-10-06T00:02:00.000Z",
    };
    const rpc = vi.fn().mockResolvedValue({ data: queued, error: null });
    const store = new SupabaseArkStore({ rpc } as never);

    const result = await store.resumeBlockedObjective({
      objectiveId: ROW.id,
      now: "2026-10-06T00:02:00.000Z",
    });

    expect(rpc).toHaveBeenCalledWith("ark_resume_blocked_objective", {
      p_objective_id: ROW.id,
      p_now: "2026-10-06T00:02:00.000Z",
    });
    expect(result).toMatchObject({
      id: ROW.id,
      status: "queued",
      blocker: null,
    });
  });

  it("fails closed when the database rejects STOP or resume", async () => {
    const error = new Error("ark_completed_objective_cannot_cancel");
    const rpc = vi.fn().mockResolvedValue({ data: null, error });
    const store = new SupabaseArkStore({ rpc } as never);

    await expect(store.cancelObjective({
      objectiveId: ROW.id,
      now: "2026-10-06T00:03:00.000Z",
    })).rejects.toBe(error);
  });
});

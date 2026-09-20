import { describe, expect, it, vi } from "vitest";
import { readArkProjectSnapshot } from "../readModel";

function objectiveQuery(result: { data: unknown; error: unknown }) {
  const limit = vi.fn().mockResolvedValue(result);
  const order = vi.fn(() => ({ limit }));
  const eqProject = vi.fn(() => ({ order }));
  const eqUser = vi.fn(() => ({ eq: eqProject }));
  const select = vi.fn(() => ({ eq: eqUser }));
  return { select };
}

function taskQuery(result: { data: unknown; error: unknown }) {
  const order = vi.fn().mockResolvedValue(result);
  const inObjectives = vi.fn(() => ({ order }));
  const eqProject = vi.fn(() => ({ in: inObjectives }));
  const eqUser = vi.fn(() => ({ eq: eqProject }));
  const select = vi.fn(() => ({ eq: eqUser }));
  return { select };
}

function scopedReceiptQuery(result: { data: unknown; error: unknown }) {
  const limit = vi.fn().mockResolvedValue(result);
  const order = vi.fn(() => ({ limit }));
  const inObjectives = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ in: inObjectives }));
  return { select };
}

describe("ARK read model", () => {
  it("returns user/project scoped objectives, tasks, checkpoints, and events", async () => {
    const from = vi.fn((table: string) => {
      if (table === "ark_objectives") {
        return objectiveQuery({
          data: [{ id: "objective-1", goal: "finish", status: "running" }],
          error: null,
        });
      }
      if (table === "ark_tasks") {
        return taskQuery({
          data: [{
            id: "task-1",
            objective_id: "objective-1",
            task_key: "execute",
            status: "running",
          }],
          error: null,
        });
      }
      if (table === "ark_checkpoints") {
        return scopedReceiptQuery({
          data: [{
            id: "checkpoint-1",
            objective_id: "objective-1",
            task_id: "task-1",
            sequence: 1,
            next_action: "resume",
            reason: "interruption",
          }],
          error: null,
        });
      }
      return scopedReceiptQuery({
        data: [{
          id: 1,
          objective_id: "objective-1",
          task_id: "task-1",
          event_type: "task_claimed",
        }],
        error: null,
      });
    });

    const snapshot = await readArkProjectSnapshot({
      supabase: { from } as never,
      userId: "user-1",
      projectId: "project-1",
    });

    expect(snapshot.available).toBe(true);
    expect(snapshot.objectives).toHaveLength(1);
    expect(snapshot.tasks).toHaveLength(1);
    expect(snapshot.checkpoints).toHaveLength(1);
    expect(snapshot.events).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("ark_objectives");
    expect(from).toHaveBeenCalledWith("ark_tasks");
    expect(from).toHaveBeenCalledWith("ark_checkpoints");
    expect(from).toHaveBeenCalledWith("ark_events");
  });

  it("returns empty receipts when a project has no ARK objectives", async () => {
    const from = vi.fn(() =>
      objectiveQuery({
        data: [],
        error: null,
      }),
    );

    const snapshot = await readArkProjectSnapshot({
      supabase: { from } as never,
      userId: "user-1",
      projectId: "project-1",
    });

    expect(snapshot).toMatchObject({
      available: true,
      objectives: [],
      tasks: [],
      checkpoints: [],
      events: [],
    });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("reports a truthful unavailable state when the ARK table is not installed", async () => {
    const from = vi.fn(() =>
      objectiveQuery({
        data: null,
        error: { code: "42P01", message: 'relation "ark_objectives" does not exist' },
      }),
    );

    const snapshot = await readArkProjectSnapshot({
      supabase: { from } as never,
      userId: "user-1",
      projectId: "project-1",
    });

    expect(snapshot).toMatchObject({
      available: false,
      objectives: [],
      tasks: [],
      checkpoints: [],
      events: [],
    });
  });
});

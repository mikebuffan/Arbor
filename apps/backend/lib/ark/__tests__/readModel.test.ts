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
          data: [{ id: "objective-1", user_id: "user-1", project_id: "project-1", goal: "finish", status: "running" }],
          error: null,
        });
      }
      if (table === "ark_tasks") {
        return taskQuery({
          data: [{
            id: "task-1",
            user_id: "user-1",
            project_id: "project-1",
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
  it("fails closed on foreign owner/project or unrelated receipt rows returned by a privileged mock", async () => {
    const from = vi.fn((table: string) => {
      if (table === "ark_objectives") return objectiveQuery({
        data: [
          {id:"owned",user_id:"user-1",project_id:"project-1",goal:"allowed",status:"queued"},
          {id:"foreign-user",user_id:"user-2",project_id:"project-1",goal:"SECRET-OWNER",status:"queued"},
          {id:"foreign-project",user_id:"user-1",project_id:"project-2",goal:"SECRET-PROJECT",status:"queued"},
          {id:"missing-scope",goal:"SECRET-MALFORMED",status:"queued"},
        ], error: null,
      });
      if (table === "ark_tasks") return taskQuery({
        data: [
          {id:"task-owned",user_id:"user-1",project_id:"project-1",objective_id:"owned",status:"queued"},
          {id:"task-foreign",user_id:"user-2",project_id:"project-1",objective_id:"owned",status:"queued"},
          {id:"task-other-objective",user_id:"user-1",project_id:"project-1",objective_id:"foreign-user",status:"queued"},
        ], error: null,
      });
      if (table === "ark_checkpoints") return scopedReceiptQuery({
        data: [
          {id:"checkpoint-owned",objective_id:"owned",task_id:"task-owned"},
          {id:"checkpoint-foreign",objective_id:"foreign-project"},
        ], error: null,
      });
      return scopedReceiptQuery({
        data: [
          {id:"event-owned",objective_id:"owned",task_id:null},
          {id:"event-foreign",objective_id:"foreign-user"},
        ], error: null,
      });
    });
    const snapshot=await readArkProjectSnapshot({
      supabase:{from} as never,userId:"user-1",projectId:"project-1"
    });
    expect(snapshot.objectives.map(v=>v.id)).toEqual(["owned"]);
    expect(snapshot.tasks.map(v=>v.id)).toEqual(["task-owned"]);
    expect(snapshot.checkpoints.map(v=>v.id)).toEqual(["checkpoint-owned"]);
    expect(snapshot.events.map(v=>v.id)).toEqual(["event-owned"]);
    expect(JSON.stringify(snapshot)).not.toContain("SECRET");
    expect(snapshot.objectives[0]).not.toHaveProperty("user_id");
    expect(snapshot.tasks[0]).not.toHaveProperty("project_id");
  });

  it("does not attach a foreign or cross-objective task receipt to an owned objective", async () => {
    const from = vi.fn((table: string) => {
      if (table === "ark_objectives") return objectiveQuery({ data: [
        { id: "own-a", user_id: "u", project_id: "p", goal: "a" },
        { id: "own-b", user_id: "u", project_id: "p", goal: "b" },
      ], error: null });
      if (table === "ark_tasks") return taskQuery({ data: [
        { id: "task-a", user_id: "u", project_id: "p", objective_id: "own-a" },
        { id: "task-b", user_id: "u", project_id: "p", objective_id: "own-b" },
        { id: "foreign-task", user_id: "another", project_id: "p", objective_id: "own-a" },
        { id: " ", user_id: "u", project_id: "p", objective_id: "own-a" },
      ], error: null });
      if (table === "ark_checkpoints") return scopedReceiptQuery({ data: [
        { id: "checkpoint-valid", objective_id: "own-a", task_id: "task-a", next_action: "resume valid" },
        { id: "checkpoint-other-objective", objective_id: "own-a", task_id: "task-b", next_action: "SECRET-CROSS" },
        { id: "checkpoint-foreign", objective_id: "own-a", task_id: "foreign-task", next_action: "SECRET-FOREIGN" },
        { id: "checkpoint-unlinked", objective_id: "own-a", task_id: null, next_action: "SECRET-NULL" },
        { id: "checkpoint-blank", objective_id: "own-a", task_id: " ", next_action: "SECRET-BLANK" },
      ], error: null });
      return scopedReceiptQuery({ data: [
        { id: 1, objective_id: "own-a", task_id: "task-a", event_type: "task_completed" },
        { id: 2, objective_id: "own-a", task_id: null, event_type: "objective_completed" },
        { id: 3, objective_id: "own-a", task_id: "task-b", event_type: "SECRET-CROSS" },
        { id: 4, objective_id: "own-a", task_id: "foreign-task", event_type: "SECRET-FOREIGN" },
        { id: 5, objective_id: "own-a", task_id: " ", event_type: "SECRET-BLANK" },
        { id: 6, objective_id: "own-a", event_type: "SECRET-OMITTED" },
      ], error: null });
    });
    const snapshot = await readArkProjectSnapshot({
      supabase: { from } as never, userId: "u", projectId: "p",
    });
    expect(snapshot.tasks.map(v => v.id)).toEqual(["task-a", "task-b"]);
    expect(snapshot.checkpoints.map(v => v.id)).toEqual(["checkpoint-valid"]);
    expect(snapshot.events.map(v => v.id)).toEqual([1, 2]);
    expect(JSON.stringify(snapshot)).not.toContain("SECRET");
  });
});

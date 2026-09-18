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

describe("ARK read model", () => {
  it("returns user/project scoped objectives and their tasks", async () => {
    const from = vi.fn((table: string) => {
      if (table === "ark_objectives") {
        return objectiveQuery({
          data: [{ id: "objective-1", goal: "finish", status: "running" }],
          error: null,
        });
      }
      return taskQuery({
        data: [{
          id: "task-1",
          objective_id: "objective-1",
          task_key: "execute",
          status: "running",
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
    expect(from).toHaveBeenCalledWith("ark_objectives");
    expect(from).toHaveBeenCalledWith("ark_tasks");
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
    });
  });
});

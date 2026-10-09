import { describe, expect, it, vi } from "vitest";
import { SupabaseArkStore } from "../supabaseStore";

function completionClient(rows: unknown) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from } as never, from, select, eq, order };
}

describe("SupabaseArkStore completion gate", () => {
  it("accepts only completed tasks with executor verification", async () => {
    const { client } = completionClient([
      {
        objective_id: "objective-1",
        task_key: "collect",
        status: "completed",
        result: { verified: true, capability: "memory.read", attempts: 1 },
      },
      {
        objective_id: "objective-1",
        task_key: "persist",
        status: "completed",
        result: { verified: true, capability: "memory.write", attempts: 2 },
      },
    ]);

    const verification = await new SupabaseArkStore(client)
      .assessObjectiveCompletion("objective-1");

    expect(verification).toMatchObject({
      ok: true,
      unresolvedWork: [],
      evidence: {
        gate: "all_tasks_completed_with_executor_verification",
        tasks: [
          { taskKey: "collect", verified: true },
          { taskKey: "persist", verified: true },
        ],
      },
    });
  });

  it("preserves unresolved tasks instead of promoting them", async () => {
    const { client } = completionClient([
      { objective_id: "objective-1", task_key: "collect", status: "completed", result: null },
    ]);

    const verification = await new SupabaseArkStore(client)
      .assessObjectiveCompletion("objective-1");

    expect(verification).toMatchObject({
      ok: false,
      unresolvedWork: ["collect"],
    });
  });

  it("does not call an empty objective complete", async () => {
    const { client } = completionClient([]);
    const verification = await new SupabaseArkStore(client)
      .assessObjectiveCompletion("objective-1");
    expect(verification.ok).toBe(false);
  });

  it.each([
    ["foreign objective", [{ objective_id: "foreign", task_key: "SECRET", status: "completed", result: { verified: true } }]],
    ["missing objective", [{ task_key: "SECRET", status: "completed", result: { verified: true } }]],
    ["blank task key", [{ objective_id: "objective-1", task_key: " ", status: "completed", result: { verified: true } }]],
    ["null row", [null]],
    ["nonarray collection", { task_key: "SECRET" }],
    ["duplicate task key", [
      { objective_id: "objective-1", task_key: "same", status: "completed", result: { verified: true } },
      { objective_id: "objective-1", task_key: "same", status: "completed", result: { verified: true } },
    ]],
  ])("refuses completion evidence with %s", async (_label, rows) => {
    const { client } = completionClient(rows);
    await expect(new SupabaseArkStore(client).assessObjectiveCompletion("objective-1"))
      .rejects.toThrow("ark_completion_readback_invalid");
  });
});

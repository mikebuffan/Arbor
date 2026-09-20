import { describe, expect, it, vi } from "vitest";
import { SupabaseArkStore } from "../supabaseStore";

function completionClient(rows: Array<Record<string, unknown>>) {
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
        task_key: "collect",
        status: "completed",
        result: { verified: true, capability: "memory.read", attempts: 1 },
      },
      {
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
      { task_key: "collect", status: "completed", result: null },
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
});

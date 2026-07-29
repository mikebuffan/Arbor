import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  supabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

import { runMemoryDecay } from "@/lib/tasks/decay";
import { runReflectionJob } from "@/lib/tasks/reflection";
import { runMemorySync } from "@/lib/tasks/sync";

describe("maintenance task contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports unavailable decay and reflection subsystems explicitly", async () => {
    await expect(runMemoryDecay()).resolves.toEqual({
      status: "skipped",
      reason: "memory_decay_schema_unavailable",
      processed: 0,
    });
    await expect(runReflectionJob()).resolves.toEqual({
      status: "skipped",
      reason: "memory_reflections_table_absent",
      processed: 0,
    });
    expect(mocks.supabaseAdmin).not.toHaveBeenCalled();
  });

  it("syncs with current key/value fields and propagates query errors", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      limit: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.limit.mockResolvedValue({
      data: [{ id: "memory-1" }, { id: "memory-2" }],
      error: null,
    });
    mocks.supabaseAdmin.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    });

    await expect(runMemorySync("project-1")).resolves.toEqual({
      status: "completed",
      processed: 2,
    });
    expect(query.select).toHaveBeenCalledWith(
      "id, project_id, key, value",
    );

    query.limit.mockResolvedValueOnce({
      data: null,
      error: new Error("memory query failed"),
    });
    await expect(runMemorySync("project-1")).rejects.toThrow(
      "memory query failed",
    );
  });

  it("contains no active legacy memory fields or public user-table query", () => {
    const source = [
      "lib/system/loop.ts",
      "lib/tasks/decay.ts",
      "lib/tasks/reflection.ts",
      "lib/tasks/sync.ts",
    ]
      .map((file) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8"))
      .join("\n");

    expect(source).not.toMatch(/\.from\([\"']users[\"']\)/);
    expect(source).not.toMatch(/\bmem_key\b|\bmem_value\b|\bstrength\b/);
    expect(source).not.toMatch(/memory_reflections[\"']\)\.(?:insert|select)/);
    expect(source).not.toMatch(/job_queue/);
  });
});

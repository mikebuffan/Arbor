import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  embedText: vi.fn(),
  embedTexts: vi.fn(),
  memoryToEmbedString: vi.fn(),
  logMemoryEvent: vi.fn(),
}));

vi.mock("@/lib/memory/embeddings", () => ({
  embedText: mocks.embedText,
  embedTexts: mocks.embedTexts,
  memoryToEmbedString: mocks.memoryToEmbedString,
}));

vi.mock("@/lib/memory/logger", () => ({ logMemoryEvent: mocks.logMemoryEvent }));
vi.mock("@/lib/supabase/server", () => ({ getServerSupabase: vi.fn() }));

import { correctMemoryItem, reinforceMemoryUse, supersedeMemoryAliases, upsertMemoryItems } from "@/lib/memory/store";

describe("memory correction storage semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.memoryToEmbedString.mockReturnValue("bounded embedding input");
    mocks.embedText.mockResolvedValue([0.1, 0.2]);
  });

  it("increments correction count and locks through the existing correction path", async () => {
    const existing = {
      id: "memory-1",
      project_id: "project-a",
      correction_count: 1,
      mention_count: 3,
      locked: false,
    };
    const find = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
    };
    find.select.mockReturnValue(find);
    find.eq.mockReturnValue(find);
    find.is.mockReturnValue(find);
    const update = {
      update: vi.fn(), eq: vi.fn(), is: vi.fn(), select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: existing.id }, error: null }),
    };
    update.update.mockReturnValue(update);
    update.eq.mockReturnValue(update);
    update.is.mockReturnValue(update);
    update.select.mockReturnValue(update);
    const event = { insert: vi.fn().mockResolvedValue({ error: null }) };
    let memoryCalls = 0;
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "memory_pending") return event;
        memoryCalls += 1;
        return memoryCalls === 1 ? find : update;
      }),
    } as unknown as SupabaseClient;

    await expect(correctMemoryItem({
      supabase,
      authedUserId: "user-a",
      projectId: "project-a",
      key: "project.observatory.access_phrase",
      newValue: "Blue Lantern",
    })).resolves.toEqual({ id: "memory-1", locked: true });

    expect(update.update).toHaveBeenCalledWith(expect.objectContaining({
      value: { text: "Blue Lantern" },
      correction_count: 2,
      locked: true,
      pinned: true,
      importance: 10,
      confidence: 1,
      mention_count: 4,
    }));
    expect(update.eq).toHaveBeenCalledWith("status", "active");
    expect(update.is).toHaveBeenCalledWith("deleted_at", null);
    expect(event.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-a",
      project_id: "project-a",
      memory_key: "project.observatory.access_phrase",
      event_type: "lock",
      payload: { correction_count: 2 },
    }));
  });

  it("does not claim an upsert succeeded if the row was retired after both reads", async () => {
    const row = {
      id: "same-id", key: "note.current", status: "active", deleted_at: null,
      locked: false, memory_kind: "fact", value: { text: "old" },
      importance: 5, confidence: 0.8, mention_count: 0,
    };
    const read = {
      select: vi.fn(), eq: vi.fn(), is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    };
    for (const k of ["select", "eq", "is"] as const) read[k].mockReturnValue(read);
    const write = {
      update: vi.fn(), eq: vi.fn(), is: vi.fn(), select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    for (const k of ["update", "eq", "is", "select"] as const) write[k].mockReturnValue(write);
    let reads = 0;
    const supabase = { from: vi.fn(() => ++reads <= 2 ? read : write) } as unknown as SupabaseClient;
    mocks.embedTexts.mockResolvedValue([[0.1, 0.2]]);
    const outcome = await upsertMemoryItems("user-a", [{
      key: "note.current", value: "new", tier: "normal",
      importance: 5, confidence: 0.8, user_trigger_only: false, scope: "project",
    }], "project-a", supabase);
    expect(outcome).toEqual({ created: [], updated: [], locked: [], ignored: ["note.current"] });
    expect(write.eq).toHaveBeenCalledWith("status", "active");
    expect(write.is).toHaveBeenCalledWith("deleted_at", null);
    expect(write.maybeSingle).toHaveBeenCalledOnce();
    expect(mocks.logMemoryEvent).toHaveBeenCalledOnce();
    expect(mocks.logMemoryEvent).toHaveBeenCalledWith("upsert_summary", expect.objectContaining({
      updated: 0, created: 0,
    }));
  });

  it("fails closed when a correction's target is retired during embedding", async () => {
    const row = { id: "retiring-id", status: "active", deleted_at: null, locked: false, correction_count: 0 };
    const read = {
      select: vi.fn(), eq: vi.fn(), is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    };
    for (const k of ["select", "eq", "is"] as const) read[k].mockReturnValue(read);
    const write = {
      update: vi.fn(), eq: vi.fn(), is: vi.fn(), select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    for (const k of ["update", "eq", "is", "select"] as const) write[k].mockReturnValue(write);
    let reads = 0;
    const supabase = { from: vi.fn(() => ++reads === 1 ? read : write) } as unknown as SupabaseClient;
    await expect(correctMemoryItem({
      supabase, authedUserId: "user-a", projectId: "project-a",
      key: "note.current", newValue: "replacement",
    })).rejects.toThrow("memory_tombstoned_or_changed_during_correction");
    expect(write.eq).toHaveBeenCalledWith("status", "active");
    expect(write.is).toHaveBeenCalledWith("deleted_at", null);
    expect(mocks.logMemoryEvent).not.toHaveBeenCalled();
  });

  it("does not silently reactivate a superseded alias via ordinary ingestion", async () => {
    const retired = {
      id: "old-alias", status: "tombstoned", deleted_at: "2026-10-07T00:00:00.000Z",
      locked: false,
    };
    const read = {
      select: vi.fn(), eq: vi.fn(), is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: retired, error: null }),
    };
    read.select.mockReturnValue(read);
    read.eq.mockReturnValue(read);
    read.is.mockReturnValue(read);
    const supabase = {
      from: vi.fn(() => read),
    } as unknown as SupabaseClient;
    const result = await upsertMemoryItems("user-a", [{
      key: "alias.retired", value: "stale assertion", tier: "normal",
      importance: 5, confidence: 0.8, user_trigger_only: false, scope: "project",
    }], "project-a", supabase);
    expect(result).toEqual({ created: [], updated: [], locked: [], ignored: ["alias.retired"] });
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(read.maybeSingle).toHaveBeenCalledTimes(1);
    expect(mocks.embedTexts).not.toHaveBeenCalled();
    expect(mocks.embedText).not.toHaveBeenCalled();
    // Summary telemetry is not a persisted memory/event or an alias revival.
    expect(mocks.logMemoryEvent).toHaveBeenCalledOnce();
    expect(mocks.logMemoryEvent).toHaveBeenCalledWith("upsert_summary", expect.objectContaining({
      created: 0,
      updated: 0,
    }));
  });

  it("rejects correcting an already retired alias without explicit restore authority", async () => {
    const retired = {
      id: "old-alias", status: "tombstoned", deleted_at: "2026-10-07T00:00:00.000Z",
      locked: false,
    };
    const read = {
      select: vi.fn(), eq: vi.fn(), is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: retired, error: null }),
    };
    read.select.mockReturnValue(read);
    read.eq.mockReturnValue(read);
    read.is.mockReturnValue(read);
    const supabase = { from: vi.fn(() => read) } as unknown as SupabaseClient;
    await expect(correctMemoryItem({
      supabase, authedUserId: "user-a", projectId: "project-a",
      key: "alias.retired", newValue: "new wording",
    })).rejects.toThrow("memory_tombstoned_requires_explicit_restore");
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(mocks.embedText).not.toHaveBeenCalled();
    expect(mocks.embedTexts).not.toHaveBeenCalled();
    expect(mocks.logMemoryEvent).not.toHaveBeenCalled();
  });

  it("does not reinforce a retired memory during mention counting", async () => {
    const retired = {
      id: "old-alias", status: "active", deleted_at: "2026-10-07T00:00:00.000Z",
      locked: false,
    };
    const read = {
      select: vi.fn(), eq: vi.fn(), is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: retired, error: null }),
    };
    read.select.mockReturnValue(read);
    read.eq.mockReturnValue(read);
    read.is.mockReturnValue(read);
    const supabase = { from: vi.fn(() => read) } as unknown as SupabaseClient;
    await reinforceMemoryUse("user-a", ["alias.retired"], "project-a", supabase);
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(mocks.logMemoryEvent).not.toHaveBeenCalled();
  });

  it.each([
    { scenario: "still active", returned: { id: "memory-1" }, shouldLog: true },
    { scenario: "retired after the read", returned: null, shouldLog: false },
  ])("reinforces only when database still confirms an eligible row: $scenario", async ({ returned, shouldLog }) => {
    const active = {
      id: "memory-1", status: "active", deleted_at: null,
      locked: false, mention_count: 3,
    };
    const read = {
      select: vi.fn(), eq: vi.fn(), is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: active, error: null }),
    };
    for (const k of ["select", "eq", "is"] as const) read[k].mockReturnValue(read);
    const write = {
      update: vi.fn(), eq: vi.fn(), is: vi.fn(), select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: returned, error: null }),
    };
    for (const k of ["update", "eq", "is", "select"] as const) write[k].mockReturnValue(write);
    const event = { insert: vi.fn().mockResolvedValue({ error: null }) };
    let memoryCalls = 0;
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "memory_pending") return event;
        return ++memoryCalls === 1 ? read : write;
      }),
    } as unknown as SupabaseClient;

    await reinforceMemoryUse("user-a", ["note.current"], "project-a", supabase);
    expect(write.eq).toHaveBeenCalledWith("status", "active");
    expect(write.is).toHaveBeenCalledWith("deleted_at", null);
    expect(write.maybeSingle).toHaveBeenCalledOnce();
    if (shouldLog) {
      expect(event.insert).toHaveBeenCalledOnce();
      expect(event.insert).toHaveBeenCalledWith(expect.objectContaining({
        event_type: "reinforce", memory_key: "note.current",
      }));
    } else {
      expect(event.insert).not.toHaveBeenCalled();
    }
  });

  it("soft-tombstones exact same-project aliases and records auditable events", async () => {
    const rows = [
      { id: "alias-1", key: "project.fictional_observatory.access_phrase" },
      { id: "alias-2", key: "project.observatory.fictional.access_phrase" },
    ];
    const query = {
      update: vi.fn(), eq: vi.fn(), is: vi.fn(), in: vi.fn(), neq: vi.fn(),
      select: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.in.mockReturnValue(query);
    query.neq.mockReturnValue(query);
    const event = { insert: vi.fn().mockResolvedValue({ error: null }) };
    const supabase = {
      from: vi.fn((table: string) => table === "memory_items" ? query : event),
    } as unknown as SupabaseClient;

    await expect(supersedeMemoryAliases({
      supabase,
      authedUserId: "user-a",
      projectId: "project-a",
      canonicalId: "canonical",
      aliases: rows,
    })).resolves.toEqual(["alias-1", "alias-2"]);

    const updateShape = query.update.mock.calls[0][0];
    expect(updateShape).toMatchObject({ status: "tombstoned", delete_reason: "superseded_by_correction" });
    expect(updateShape.deleted_at).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(updateShape.deleted_at))).toBe(false);
    expect(updateShape.status).not.toBe("superseded_by_correction");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(query.eq).toHaveBeenCalledWith("project_id", "project-a");
    expect(query.in).toHaveBeenCalledWith("id", ["alias-1", "alias-2"]);
    expect(event.insert).toHaveBeenCalledTimes(2);
    expect(event.insert.mock.calls.map((call) => call[0].event_type)).toEqual([
      "superseded_by_correction", "superseded_by_correction",
    ]);
  });
});

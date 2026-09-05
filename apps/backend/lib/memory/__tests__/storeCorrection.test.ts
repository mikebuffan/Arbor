import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  embedText: vi.fn(),
  memoryToEmbedString: vi.fn(),
  logMemoryEvent: vi.fn(),
}));

vi.mock("@/lib/memory/embeddings", () => ({
  embedText: mocks.embedText,
  embedTexts: vi.fn(),
  memoryToEmbedString: mocks.memoryToEmbedString,
}));

vi.mock("@/lib/memory/logger", () => ({
  logMemoryEvent: mocks.logMemoryEvent,
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: vi.fn(),
}));

import {
  correctMemoryItem,
  supersedeMemoryAliases,
} from "@/lib/memory/store";

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
      maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
    };
    find.select.mockReturnValue(find);
    find.eq.mockReturnValue(find);
    const update = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      single: vi.fn().mockResolvedValue({
        data: { id: existing.id },
        error: null,
      }),
    };
    update.update.mockReturnValue(update);
    update.eq.mockReturnValue(update);
    update.select.mockReturnValue(update);
    const event = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    let memoryCalls = 0;
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "memory_pending") return event;
        memoryCalls += 1;
        return memoryCalls === 1 ? find : update;
      }),
    } as unknown as SupabaseClient;

    await expect(
      correctMemoryItem({
        supabase,
        authedUserId: "user-a",
        projectId: "project-a",
        key: "project.observatory.access_phrase",
        newValue: "Blue Lantern",
      }),
    ).resolves.toEqual({ id: "memory-1", locked: true });

    expect(update.update).toHaveBeenCalledWith(
      expect.objectContaining({
        value: { text: "Blue Lantern" },
        correction_count: 2,
        locked: true,
        pinned: true,
        importance: 10,
        confidence: 1,
        mention_count: 4,
      }),
    );
    expect(event.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-a",
        project_id: "project-a",
        memory_key: "project.observatory.access_phrase",
        event_type: "lock",
        payload: { correction_count: 2 },
      }),
    );
  });

  it("soft-tombstones exact same-project aliases and records auditable events", async () => {
    const rows = [
      { id: "alias-1", key: "project.fictional_observatory.access_phrase" },
      { id: "alias-2", key: "project.observatory.fictional.access_phrase" },
    ];
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      in: vi.fn(),
      neq: vi.fn(),
      select: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.in.mockReturnValue(query);
    query.neq.mockReturnValue(query);
    const event = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = {
      from: vi.fn((table: string) =>
        table === "memory_items" ? query : event,
      ),
    } as unknown as SupabaseClient;

    await expect(
      supersedeMemoryAliases({
        supabase,
        authedUserId: "user-a",
        projectId: "project-a",
        canonicalId: "canonical",
        aliases: rows,
      }),
    ).resolves.toEqual(["alias-1", "alias-2"]);

    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "tombstoned",
        delete_reason: "superseded_by_correction",
      }),
    );
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(query.eq).toHaveBeenCalledWith("project_id", "project-a");
    expect(query.in).toHaveBeenCalledWith("id", ["alias-1", "alias-2"]);
    expect(event.insert).toHaveBeenCalledTimes(2);
    expect(
      event.insert.mock.calls.map((call) => call[0].event_type),
    ).toEqual([
      "superseded_by_correction",
      "superseded_by_correction",
    ]);
  });
});

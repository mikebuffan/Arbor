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

vi.mock("@/lib/memory/logger", () => ({
  logMemoryEvent: mocks.logMemoryEvent,
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: vi.fn(),
}));

import { upsertMemoryItems } from "@/lib/memory/store";

const conversationItem = {
  key: "user.preference.example",
  value: "example",
  tier: "normal" as const,
  scope: "conversation" as const,
  user_trigger_only: false,
  importance: 6,
  confidence: 0.9,
};

describe("conversation memory write isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.memoryToEmbedString.mockReturnValue("memory text");
    mocks.embedTexts.mockResolvedValue([[0.1, 0.2]]);
    mocks.embedText.mockResolvedValue([0.1, 0.2]);
  });

  it("rejects conversation-scoped writes without conversation lineage", async () => {
    const supabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const result = await upsertMemoryItems(
      "user-a",
      [conversationItem],
      "project-a",
      supabase,
      null,
    );

    expect(result.created).toEqual([]);
    expect(result.updated).toEqual([]);
    expect(result.ignored).toEqual(["user.preference.example"]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("writes conversation_id and matches the exact conversation scope", async () => {
    const find = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    find.select.mockReturnValue(find);
    find.eq.mockReturnValue(find);
    find.is.mockReturnValue(find);

    const memoryInsert = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    const eventInsert = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    let memoryCalls = 0;
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "memory_pending") return eventInsert;
        memoryCalls += 1;
        return memoryCalls === 1 ? find : memoryInsert;
      }),
    } as unknown as SupabaseClient;

    const result = await upsertMemoryItems(
      "user-a",
      [conversationItem],
      "project-a",
      supabase,
      "conversation-a",
    );

    expect(result.created).toEqual(["user.preference.example"]);
    expect(find.eq).toHaveBeenCalledWith("scope", "conversation");
    expect(find.eq).toHaveBeenCalledWith("project_id", "project-a");
    expect(find.eq).toHaveBeenCalledWith("conversation_id", "conversation-a");
    expect(memoryInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-a",
        project_id: "project-a",
        conversation_id: "conversation-a",
        scope: "conversation",
        key: "user.preference.example",
      }),
    );
  });
});

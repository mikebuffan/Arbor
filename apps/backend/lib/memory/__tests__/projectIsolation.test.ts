import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  logMemoryEvent: vi.fn(),
  embedText: vi.fn(),
}));

vi.mock("@/lib/memory/logger", () => ({
  logMemoryEvent: mocks.logMemoryEvent,
}));

vi.mock("@/lib/memory/embeddings", () => ({
  embedText: mocks.embedText,
  embedTexts: vi.fn(),
  memoryToEmbedString: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: vi.fn(),
}));

import { reinforceMemoryUse } from "@/lib/memory/store";
import {
  getMemoryContext,
  isMemoryInProjectScope,
  isMemoryInRuntimeScope,
} from "@/lib/memory/retrieval";

describe("memory project isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("looks up an existing memory by authenticated user, project, and key", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    await reinforceMemoryUse(
      "user-a",
      ["shared-key"],
      "project-a",
      supabase,
    );

    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(query.eq).toHaveBeenCalledWith("key", "shared-key");
    expect(query.eq).toHaveBeenCalledWith("project_id", "project-a");
  });

  it("keeps a global memory lookup separate from every project", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    await reinforceMemoryUse("user-a", ["shared-key"], null, supabase);

    expect(query.is).toHaveBeenCalledWith("project_id", null);
  });

  it("filters vector retrieval results to the authenticated project", () => {
    expect(
      isMemoryInProjectScope(
        { project_id: "project-a", scope: "project" },
        "project-a",
      ),
    ).toBe(true);
    expect(
      isMemoryInProjectScope(
        { project_id: "project-b", scope: "project" },
        "project-a",
      ),
    ).toBe(false);
    expect(
      isMemoryInProjectScope(
        { project_id: null, scope: "global" },
        "project-a",
      ),
    ).toBe(true);
  });

  it("uses scoped semantic retrieval for the authenticated project and conversation", async () => {
    mocks.embedText.mockResolvedValue([0.1, 0.2, 0.3]);

    const fallbackResponse = {
      data: [
        {
          id: "memory-global",
          project_id: null,
          conversation_id: null,
          key: "global-key",
          value: { text: "global" },
          tier: "core",
          scope: "global",
          status: "active",
          deleted_at: null,
          pinned: true,
        },
      ],
      error: null,
    };

    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      order: vi.fn(),
      or: vi.fn(),
      limit: vi.fn(),
      then: (resolve: (value: typeof fallbackResponse) => unknown) =>
        Promise.resolve(fallbackResponse).then(resolve),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.or.mockReturnValue(query);
    query.limit.mockReturnValue(query);

    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "semantic-project",
          project_id: "project-a",
          conversation_id: null,
          key: "project-a-key",
          value: { text: "project A relevant memory" },
          tier: "normal",
          scope: "project",
          user_trigger_only: false,
          status: "active",
          deleted_at: null,
          similarity: 0.91,
        },
        {
          id: "semantic-conversation",
          project_id: "project-a",
          conversation_id: "conversation-a",
          key: "conversation-a-key",
          value: { text: "conversation A relevant memory" },
          tier: "normal",
          scope: "conversation",
          user_trigger_only: false,
          status: "active",
          deleted_at: null,
          similarity: 0.88,
        },
      ],
      error: null,
    });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
      rpc,
    } as unknown as SupabaseClient;

    const result = await getMemoryContext({
      supabase,
      authedUserId: "user-a",
      projectId: "project-a",
      conversationId: "conversation-a",
      latestUserText: "What did we decide about the relevant memory?",
      useVectorSearch: true,
    });

    expect(mocks.embedText).toHaveBeenCalledWith(
      "What did we decide about the relevant memory?",
    );
    expect(rpc).toHaveBeenCalledWith("match_memory_items", {
      p_include_user_trigger_only: false,
      p_match_count: 40,
      p_project_id: "project-a",
      p_conversation_id: "conversation-a",
      p_query_embedding: [0.1, 0.2, 0.3],
      p_tiers: ["core", "normal", "sensitive"],
      p_user_id: "user-a",
    });
    expect(result.keysUsed).toEqual([
      "global-key",
      "project-a-key",
      "conversation-a-key",
    ]);
  });

  it("rejects memories from the wrong project or conversation scope", () => {
    expect(
      isMemoryInRuntimeScope(
        {
          project_id: "project-a",
          conversation_id: null,
          scope: "project",
        },
        "project-a",
        "conversation-a",
      ),
    ).toBe(true);

    expect(
      isMemoryInRuntimeScope(
        {
          project_id: "project-b",
          conversation_id: null,
          scope: "project",
        },
        "project-a",
        "conversation-a",
      ),
    ).toBe(false);

    expect(
      isMemoryInRuntimeScope(
        {
          project_id: "project-a",
          conversation_id: "conversation-b",
          scope: "conversation",
        },
        "project-a",
        "conversation-a",
      ),
    ).toBe(false);

    expect(
      isMemoryInRuntimeScope(
        {
          project_id: "project-a",
          conversation_id: "conversation-a",
          scope: "conversation",
        },
        "project-a",
        "conversation-a",
      ),
    ).toBe(true);
  });

  it("requires controlled imports to create projects with the supplied user_id", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/import_chatgpt/runImport.ts"),
      "utf8",
    );

    expect(source).toContain("user_id: userId");
    expect(source).toContain("data.user_id !== userId");
    expect(source).toContain("ensureProjectRow(supabase, projectId, userId)");
  });

  it("keeps retrieval fresh and does not log the current user message", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "lib/memory/retrieval.ts"),
      "utf8",
    );

    expect(source).not.toContain("const memoryCache");
    expect(source).not.toMatch(
      /console\.(log|debug)\([^)]*latestUserText[\s\S]*?\)/,
    );
    expect(source).toContain("void params.useCache");
  });

  it("retrieves the corrected value and excludes superseded stale aliases", async () => {
    const response = {
      data: [
        {
          id: "canonical",
          project_id: "project-a",
          key: "project.observatory.access_phrase",
          value: { text: "Blue Lantern" },
          tier: "core",
          scope: "project",
          status: "active",
          deleted_at: null,
          pinned: true,
          locked: false,
        },
        {
          id: "stale-alias",
          project_id: "project-a",
          key: "project.fictional_observatory.access_phrase",
          value: { text: "Silver Orchard" },
          tier: "normal",
          scope: "project",
          status: "tombstoned",
          deleted_at: "2026-09-02T05:00:00.000Z",
          pinned: false,
          locked: false,
        },
      ],
      error: null,
    };
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      order: vi.fn(),
      or: vi.fn(),
      limit: vi.fn(),
      then: (resolve: (value: typeof response) => unknown) =>
        Promise.resolve(response).then(resolve),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.or.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getMemoryContext({
      supabase,
      authedUserId: "user-a",
      projectId: "project-a",
      latestUserText: "What is the observatory access phrase?",
    });

    expect(result.keysUsed).toEqual([
      "project.observatory.access_phrase",
    ]);
    expect(JSON.stringify(result)).toContain("Blue Lantern");
    expect(JSON.stringify(result)).not.toContain("Silver Orchard");
  });
});

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  logMemoryEvent: vi.fn(),
}));

vi.mock("@/lib/memory/logger", () => ({
  logMemoryEvent: mocks.logMemoryEvent,
}));

vi.mock("@/lib/memory/embeddings", () => ({
  embedText: vi.fn(),
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

  it("disables vector RPC use and filters direct retrieval to the authenticated project", async () => {
    const response = {
      data: [
        {
          id: "memory-a",
          project_id: "project-a",
          key: "project-a-key",
          value: { text: "project A" },
          tier: "normal",
          scope: "project",
          status: "active",
          deleted_at: null,
        },
        {
          id: "memory-b",
          project_id: "project-b",
          key: "project-b-key",
          value: { text: "project B" },
          tier: "normal",
          scope: "project",
          status: "active",
          deleted_at: null,
        },
        {
          id: "memory-global",
          project_id: null,
          key: "global-key",
          value: { text: "global" },
          tier: "core",
          scope: "global",
          status: "active",
          deleted_at: null,
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
    const rpc = vi.fn();
    const supabase = {
      from: vi.fn().mockReturnValue(query),
      rpc,
    } as unknown as SupabaseClient;

    const result = await getMemoryContext({
      supabase,
      authedUserId: "user-a",
      projectId: "project-a",
      latestUserText: "This query is long enough for vector retrieval.",
      useVectorSearch: true,
    });

    expect(rpc).not.toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(query.or).toHaveBeenCalledWith(
      "project_id.eq.project-a,scope.eq.global",
    );
    expect(result.keysUsed).toEqual(["project-a-key", "global-key"]);
    expect(result.keysUsed).not.toContain("project-b-key");
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
});

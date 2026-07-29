import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  getMemoryContext: vi.fn(),
  getProjectAnchors: vi.fn(),
  logMemoryEvent: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/memory/retrieval", () => ({
  getMemoryContext: mocks.getMemoryContext,
}));

vi.mock("@/lib/memory/anchors", () => ({
  getProjectAnchors: mocks.getProjectAnchors,
  anchorsToPromptBlock: vi.fn(() => ""),
}));

vi.mock("@/lib/memory/logger", () => ({
  logMemoryEvent: mocks.logMemoryEvent,
}));

import { buildPromptContext } from "@/lib/prompt/buildPromptContext";

const emptyMemory = {
  core: [],
  normal: [],
  sensitive: [],
  keysUsed: [],
};

function promptClient() {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: mocks.maybeSingle,
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return {
    from: vi.fn(() => query),
  } as unknown as SupabaseClient;
}

describe("buildPromptContext freshness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.maybeSingle.mockResolvedValue({
      data: { persona: "Arbor", framework_version: "v1", description: "Grounded" },
      error: null,
    });
    mocks.getProjectAnchors.mockResolvedValue([]);
    mocks.getMemoryContext.mockResolvedValue(emptyMemory);
    mocks.logMemoryEvent.mockResolvedValue(undefined);
  });

  it("uses the current message on every prompt build", async () => {
    await buildPromptContext({
      supabase: promptClient(),
      authedUserId: "user-1",
      projectId: "project-1",
      conversationId: "conversation-1",
      latestUserText: "first current message",
    });
    await buildPromptContext({
      supabase: promptClient(),
      authedUserId: "user-1",
      projectId: "project-1",
      conversationId: "conversation-1",
      latestUserText: "second current message",
    });

    expect(mocks.getMemoryContext).toHaveBeenCalledTimes(2);
    expect(mocks.getMemoryContext).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ latestUserText: "first current message" }),
    );
    expect(mocks.getMemoryContext).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ latestUserText: "second current message" }),
    );
  });

  it("never reuses a prior turn's safety addendum", async () => {
    const first = await buildPromptContext({
      supabase: promptClient(),
      authedUserId: "user-1",
      projectId: "project-1",
      conversationId: "conversation-1",
      latestUserText: "first",
      safety: { systemAddendum: "SAFETY-FIRST-TURN" },
    });
    const second = await buildPromptContext({
      supabase: promptClient(),
      authedUserId: "user-1",
      projectId: "project-1",
      conversationId: "conversation-1",
      latestUserText: "second",
      safety: { systemAddendum: "SAFETY-SECOND-TURN" },
    });

    expect(first.systemPrompt).toContain("SAFETY-FIRST-TURN");
    expect(second.systemPrompt).toContain("SAFETY-SECOND-TURN");
    expect(second.systemPrompt).not.toContain("SAFETY-FIRST-TURN");
  });

  it("has no prompt cache state", () => {
    const filePath = fileURLToPath(new URL("../buildPromptContext.ts", import.meta.url));
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).not.toMatch(/promptCache|cacheExpiry|PROMPT_CACHE_TTL/);
  });
});

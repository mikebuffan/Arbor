import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/providers/openai", () => ({
  openAIChat: vi.fn(),
}));

import {
  assertProjectOwnedByUser,
  buildChatSuccessResponse,
} from "@/app/api/chat/route";

describe("chat Milestone 1A contract", () => {
  it("preserves project and conversation IDs during safety replacement", () => {
    expect(
      buildChatSuccessResponse({
        projectId: "project-1",
        conversationId: "conversation-1",
        assistantText: "Safe replacement",
        flagged: true,
      }),
    ).toEqual({
      ok: true,
      projectId: "project-1",
      conversationId: "conversation-1",
      assistantText: "Safe replacement",
      flagged: true,
    });
  });

  it("returns 404 semantics for a non-owned project", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    await expect(
      assertProjectOwnedByUser(supabase, "user-1", "someone-elses-project"),
    ).rejects.toMatchObject({ status: 404, code: "project_not_found" });
  });

  it("uses one prompt builder and no route-local memory injection", () => {
    const routePath = fileURLToPath(
      new URL("../../../app/api/chat/route.ts", import.meta.url),
    );
    const source = fs.readFileSync(routePath, "utf8");

    expect(source.match(/buildPromptContext\s*\(/g)).toHaveLength(1);
    expect(source).not.toMatch(/getMemoryContext/);
    expect(source).not.toContain("[MEMORY CONTEXT]");
    expect(source).not.toMatch(/memoryBlock/);
  });
});

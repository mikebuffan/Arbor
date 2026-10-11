import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/providers/openai", () => ({
  openAIChat: vi.fn(),
}));

import {
  buildChatSuccessResponse,
  loadRecentMessages,
} from "../routeSupport";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";

describe("chat Milestone 1A contract", () => {
  it("guards a bare continuation with owner-scoped unfinished-goal readback before ingestion and agent execution", () => {
    const routePath = fileURLToPath(new URL("../../../app/api/chat/route.ts", import.meta.url));
    const source = fs.readFileSync(routePath, "utf8");
    const control = source.indexOf("const conversationControl = classifyConversationWorkControl(userText)");
    const unbound = source.indexOf("if (isStandaloneContinuationCue(userText))");
    const memory = source.indexOf("await ingestMemorySignals({");
    const session = source.indexOf("let agencyState = await beginAgencySession({");
    expect(unbound).toBeGreaterThan(control);
    expect(memory).toBeGreaterThan(unbound);
    expect(session).toBeGreaterThan(memory);
    const boundary = source.slice(unbound, memory);
    expect(boundary).toContain("readPriorAgencySession");
    expect(boundary).toContain("!hasLiveAgencyGoal(priorAgency)");
    expect(boundary).toContain("persistFinalAssistantTurn");
    expect(boundary).toContain("return NextResponse.json");
    expect(boundary).not.toContain("runOpenAIAgencyAgent");
  });

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

  it("handles pause/refusal before memory processing or agency execution and does not claim ARK cancellation", () => {
    const routePath = fileURLToPath(new URL("../../../app/api/chat/route.ts", import.meta.url));
    const source = fs.readFileSync(routePath, "utf8");
    const control = source.indexOf("const conversationControl = classifyConversationWorkControl(userText)");
    const memory = source.indexOf("await ingestMemorySignals({");
    const agency = source.indexOf("let agencyState = await beginAgencySession({");
    expect(control).toBeGreaterThan(0);
    expect(memory).toBeGreaterThan(control);
    expect(agency).toBeGreaterThan(memory);
    const controlBlock = source.slice(control, memory);
    expect(controlBlock).toContain("await holdAgencyForConversationControl");
    expect(controlBlock).toContain("persistFinalAssistantTurn");
    expect(controlBlock).toContain("return NextResponse.json");
    expect(controlBlock).not.toContain("cancelArkObjective");
    expect(controlBlock).not.toContain("control_ark_objective");
    expect(controlBlock).toContain("already running may require its own STOP");
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

  it("never presents pending capability verification as completed action evidence", () => {
    const routePath = fileURLToPath(
      new URL("../../../app/api/chat/route.ts", import.meta.url),
    );
    const source = fs.readFileSync(routePath, "utf8");

    // These are outstanding obligations, not independently verified receipts.
    expect(source).toContain("verify capability result: ");
    expect(source).not.toMatch(/priorActionEvidence:\s*agencyState\.unresolvedWork/);
    expect(source).not.toContain('} completed successfully`');
  });

  it("requires a UUID turnId without changing the success response shape", () => {
    const routePath = fileURLToPath(
      new URL("../../../app/api/chat/route.ts", import.meta.url),
    );
    const source = fs.readFileSync(routePath, "utf8");

    expect(source).toContain("turnId: z.string().uuid()");
    expect(
      buildChatSuccessResponse({
        projectId: "project-1",
        conversationId: "conversation-1",
        assistantText: "Answer",
      }),
    ).toEqual({
      ok: true,
      projectId: "project-1",
      conversationId: "conversation-1",
      assistantText: "Answer",
    });
  });

  it("returns the exact durable assistant content in conversation history", async () => {
    const response = {
      data: [
        { role: "user", content: "Question" },
        { role: "assistant", content: "Exact visible final response" },
      ],
      error: null,
    };
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      or: vi.fn(),
      order: vi.fn(),
      limit: vi.fn().mockResolvedValue(response),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.or.mockReturnValue(query);
    query.order.mockReturnValue(query);
    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    await expect(
      loadRecentMessages(supabase, "user-1", "conversation-1"),
    ).resolves.toEqual(response.data);
  });
});

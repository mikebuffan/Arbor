import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getMemoryContext,
  type RetrievedMemoryItem,
} from "@/lib/memory/retrieval";
import { assembleMemoryBlock } from "@/lib/memory/assembleMemoryBlock";
import { buildContinuityState } from "@/lib/arbor/continuity/state";

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: crypto.randomUUID(),
    user_id: "user-a",
    project_id: "project-a",
    conversation_id: null,
    key: "memory.note",
    value: { text: "ordinary background note" },
    tier: "normal",
    scope: "project",
    user_trigger_only: false,
    importance: 8,
    confidence: 0.9,
    locked: false,
    pinned: false,
    status: "active",
    deleted_at: null,
    mention_count: 0,
    last_seen_at: "2026-01-01T00:00:00.000Z",
    last_reinforced_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function queryFor(data: unknown[]) {
  const response = { data, error: null };
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
  return query;
}

describe("longitudinal memory", () => {
  it("recovers an older relevant memory instead of blindly taking the first 50", async () => {
    const irrelevant = Array.from({ length: 60 }, (_, index) =>
      row({
        id: `irrelevant-${index}`,
        key: `notes.unrelated.${index}`,
        value: { text: `unrelated background item ${index}` },
        importance: 10,
      }),
    );
    const relevant = row({
      id: "relevant",
      key: "preferences.coffee.order",
      value: { text: "oat milk cortado" },
      importance: 2,
    });
    const query = queryFor([...irrelevant, relevant]);
    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getMemoryContext({
      supabase,
      authedUserId: "user-a",
      projectId: "project-a",
      conversationId: "conversation-current",
      latestUserText: "What was my coffee order?",
    });

    expect(query.limit).toHaveBeenCalledWith(500);
    expect(result.keysUsed).toContain("preferences.coffee.order");
  });

  it("keeps bound conversation memory inside its conversation while preserving legacy rows", async () => {
    const query = queryFor([
      row({
        id: "current",
        key: "conversation.current",
        scope: "conversation",
        conversation_id: "conversation-current",
      }),
      row({
        id: "other",
        key: "conversation.other",
        scope: "conversation",
        conversation_id: "conversation-other",
      }),
      row({
        id: "legacy",
        key: "conversation.legacy",
        scope: "conversation",
        conversation_id: null,
      }),
    ]);
    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getMemoryContext({
      supabase,
      authedUserId: "user-a",
      projectId: "project-a",
      conversationId: "conversation-current",
      latestUserText: "current legacy",
    });

    expect(result.keysUsed).toContain("conversation.current");
    expect(result.keysUsed).toContain("conversation.legacy");
    expect(result.keysUsed).not.toContain("conversation.other");
  });

  it("does not age durable project memory out of the prompt", () => {
    const oldProjectMemory: RetrievedMemoryItem = {
      id: "old-project-memory",
      project_id: "project-a",
      conversation_id: null,
      key: "project.architecture.memory_rule",
      value: { text: "corrections outrank stale claims" },
      tier: "normal",
      scope: "project",
      user_trigger_only: false,
      importance: 8,
      confidence: 1,
      pinned: false,
      locked: false,
      status: "active",
      deleted_at: null,
      mention_count: 1,
      last_seen_at: "2025-01-01T00:00:00.000Z",
      last_reinforced_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
      content_text: "corrections outrank stale claims",
    };

    const assembled = assembleMemoryBlock({
      allItems: [oldProjectMemory],
      userText: "memory rule",
      decayMs: 1,
    });

    expect(assembled.selectedItems.map((item) => item.id)).toEqual([
      "old-project-memory",
    ]);
  });

  it("projects previous-session turns into the continuity block", () => {
    const state = buildContinuityState({
      activeSubsystem: "arbor",
      channel: "text",
      lastMeaningfulUserTurn: "Current question",
      previousSessionUserTurn: "Finish the memory pass",
      previousSessionArborTurn: "I was tracing retrieval",
      previousSessionConversationId: "previous-conversation",
    });

    expect(state.previousSessionUserTurn).toBe("Finish the memory pass");
    expect(state.previousSessionArborTurn).toBe("I was tracing retrieval");
    expect(state.previousSessionConversationId).toBe("previous-conversation");
  });
});

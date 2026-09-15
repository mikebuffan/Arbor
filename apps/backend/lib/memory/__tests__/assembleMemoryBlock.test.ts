import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/providers/openai", () => ({
  openAIEmbed: vi.fn(),
}));

import { assembleMemoryBlock } from "../assembleMemoryBlock";
import type { RetrievedMemoryItem } from "../retrieval";

function memory(
  overrides: Partial<RetrievedMemoryItem> = {},
): RetrievedMemoryItem {
  return {
    id: overrides.id ?? "memory-1",
    project_id: overrides.project_id ?? "project-1",
    conversation_id: overrides.conversation_id ?? null,
    key: overrides.key ?? "preferences.response.style",
    value: overrides.value ?? { text: "Keep responses direct." },
    tier: overrides.tier ?? "normal",
    scope: overrides.scope ?? "project",
    user_trigger_only: overrides.user_trigger_only ?? false,
    importance: overrides.importance ?? 8,
    confidence: overrides.confidence ?? 0.9,
    mention_count: overrides.mention_count ?? 0,
    correction_count: overrides.correction_count ?? 0,
    pinned: overrides.pinned ?? false,
    locked: overrides.locked ?? false,
    status: overrides.status ?? "active",
    deleted_at: overrides.deleted_at ?? null,
    last_seen_at: overrides.last_seen_at ?? null,
    last_reinforced_at: overrides.last_reinforced_at ?? null,
    updated_at:
      overrides.updated_at ??
      "2026-01-01T00:00:00.000Z",
    similarity: overrides.similarity ?? 0.8,
    content_text:
      overrides.content_text ??
      "Keep responses direct.",
  };
}

describe("memory prompt durability", () => {
  it("keeps an old but reinforced memory available", () => {
    const result = assembleMemoryBlock({
      allItems: [
        memory({
          mention_count: 7,
          importance: 6,
          confidence: 0.8,
          updated_at: "2025-01-01T00:00:00.000Z",
        }),
      ],
      userText: "How should you respond?",
      decayMs: 1000,
    });

    expect(result.selectedItems).toHaveLength(1);
  });

  it("keeps old high-authority memory even without recent reinforcement", () => {
    const result = assembleMemoryBlock({
      allItems: [
        memory({
          importance: 9,
          confidence: 0.95,
          mention_count: 0,
          updated_at: "2025-01-01T00:00:00.000Z",
        }),
      ],
      userText: "How should you respond?",
      decayMs: 1000,
    });

    expect(result.selectedItems).toHaveLength(1);
  });

  it("still lets low-signal stale notes decay", () => {
    const result = assembleMemoryBlock({
      allItems: [
        memory({
          importance: 3,
          confidence: 0.5,
          mention_count: 0,
          updated_at: "2025-01-01T00:00:00.000Z",
        }),
      ],
      userText: "Anything relevant?",
      decayMs: 1000,
    });

    expect(result.selectedItems).toHaveLength(0);
  });
});

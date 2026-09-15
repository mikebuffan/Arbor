import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/providers/openai", () => ({
  openAIEmbed: vi.fn(),
}));

import {
  memoryStabilityScore,
  type RetrievedMemoryItem,
} from "../retrieval";

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
    importance: overrides.importance ?? 7,
    confidence: overrides.confidence ?? 0.9,
    mention_count: overrides.mention_count ?? 0,
    correction_count: overrides.correction_count ?? 0,
    pinned: overrides.pinned ?? false,
    locked: overrides.locked ?? false,
    status: overrides.status ?? "active",
    deleted_at: overrides.deleted_at ?? null,
    last_seen_at: overrides.last_seen_at ?? null,
    last_reinforced_at: overrides.last_reinforced_at ?? null,
    updated_at: overrides.updated_at ?? null,
    similarity: overrides.similarity ?? 0.75,
    content_text: overrides.content_text ?? "Keep responses direct.",
  };
}

describe("memory stability ranking", () => {
  it("ranks reinforced memory above an otherwise identical one-off", () => {
    const oneOff = memory({
      id: "one-off",
      mention_count: 0,
    });
    const reinforced = memory({
      id: "reinforced",
      mention_count: 10,
    });

    expect(memoryStabilityScore(reinforced))
      .toBeGreaterThan(memoryStabilityScore(oneOff));
  });

  it("ranks correction authority above otherwise identical uncorrected memory", () => {
    const ordinary = memory({
      id: "ordinary",
      correction_count: 0,
    });
    const corrected = memory({
      id: "corrected",
      correction_count: 3,
    });

    expect(memoryStabilityScore(corrected))
      .toBeGreaterThan(memoryStabilityScore(ordinary));
  });
});

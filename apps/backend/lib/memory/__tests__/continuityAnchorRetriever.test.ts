import { describe, expect, it } from "vitest";
import {
  isContinuityCue,
  selectContinuityAnchors,
} from "@/lib/memory/continuityAnchorRetriever";
import type { RetrievedMemoryItem } from "@/lib/memory/retrieval";

function memory(
  id: string,
  key: string,
  content: string,
  overrides: Partial<RetrievedMemoryItem> = {},
): RetrievedMemoryItem {
  return {
    id,
    project_id: "project-a",
    conversation_id: null,
    key,
    value: { text: content },
    tier: "normal",
    scope: "project",
    user_trigger_only: false,
    importance: 5,
    confidence: 0.8,
    pinned: false,
    locked: false,
    status: "active",
    deleted_at: null,
    last_seen_at: null,
    last_reinforced_at: null,
    updated_at: "2026-09-14T20:00:00.000Z",
    similarity: 0.3,
    content_text: content,
    ...overrides,
  };
}

describe("continuity anchor retriever", () => {
  it("detects explicit continuity cues", () => {
    expect(isContinuityCue("Can we continue what we were doing?")).toBe(true);
    expect(isContinuityCue("What is the weather?")).toBe(false);
  });

  it("keeps the active entity lane and drops irrelevant memory flood", () => {
    const relevant = memory(
      "relevant",
      "project.arbor.memory_repair",
      "Arbor memory repair is the active project and semantic retrieval is being restored.",
      { similarity: 0.91, importance: 9 },
    );
    const correction = memory(
      "correction",
      "relationship.arbor.correction.agency",
      "Repeated go prompts are a continuity failure; continue obvious safe work without asking again.",
      { similarity: 0.78, importance: 10, tier: "core", pinned: true },
    );
    const irrelevant = Array.from({ length: 30 }, (_, index) =>
      memory(
        `irrelevant-${index}`,
        `notes.unrelated.${index}`,
        `Unrelated archived detail number ${index} about a different topic.`,
        { similarity: 0.05, importance: 4 },
      ),
    );

    const selected = selectContinuityAnchors(
      [relevant, correction, ...irrelevant],
      "Continue the Arbor memory repair. Don't make me tell you to go again.",
      6,
    );

    expect(selected.map((item) => item.id)).toContain("relevant");
    expect(selected.map((item) => item.id)).toContain("correction");
    expect(selected).toHaveLength(6);
    expect(
      selected.filter((item) => item.id.startsWith("irrelevant-")).length,
    ).toBeLessThan(6);
  });

  it("caps even core-heavy candidate sets instead of flooding the prompt", () => {
    const rows = Array.from({ length: 25 }, (_, index) =>
      memory(
        `core-${index}`,
        `identity.rule.${index}`,
        `Identity rule ${index}`,
        {
          tier: "core",
          pinned: true,
          importance: 10,
          similarity: index === 24 ? 0.95 : 0.2,
        },
      ),
    );

    const selected = selectContinuityAnchors(rows, "identity rule 24", 10);

    expect(selected).toHaveLength(10);
    expect(selected[0].id).toBe("core-24");
  });
});

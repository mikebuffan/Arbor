import { describe, expect, it } from "vitest";
import {
  applyMemoryPromotion,
  scoreMemoryPromotion,
  scoreMemoryPromotionBatch,
} from "../memoryPromotion";
import type { MemoryItem } from "../types";

function item(
  overrides: Partial<MemoryItem> & Pick<MemoryItem, "key" | "value">,
): MemoryItem {
  return {
    key: overrides.key,
    value: overrides.value,
    tier: overrides.tier ?? "normal",
    user_trigger_only: overrides.user_trigger_only ?? false,
    importance: overrides.importance ?? 5,
    confidence: overrides.confidence ?? 0.8,
    scope: overrides.scope ?? "conversation",
    pinned: overrides.pinned,
    locked: overrides.locked,
    evidence: overrides.evidence,
  };
}

describe("automatic memory promotion", () => {
  it("withholds permanent identity promotion without current-turn durable authorization", () => {
    const result = scoreMemoryPromotion({
      item: item({
        key: "arbor.identity.baseline",
        value: "Arbor must preserve continuity and avoid generic drift.",
        importance: 9,
        confidence: 0.95,
        scope: "project",
      }),
      userMessage: "Arbor must preserve continuity and avoid generic drift.",
    });

    expect(result.classification).not.toBe("anchor");
    expect(result.classification).not.toBe("promote");
    expect(result.reasons).toContain("Durable promotion withheld: no explicit current-turn authorization.");
  });

  it("promotes identity continuity when durable authorization is explicit", () => {
    const result = scoreMemoryPromotion({
      item: item({
        key: "arbor.identity.baseline",
        value: "Arbor must preserve continuity and avoid generic drift.",
        importance: 9,
        confidence: 0.95,
        scope: "project",
      }),
      userMessage: "Remember this from now on: Arbor must preserve continuity and avoid generic drift.",
    });

    expect(result.classification).toBe("anchor");
    const [promoted] = applyMemoryPromotion([result]);
    expect(promoted.tier).toBe("core");
    expect(promoted.pinned).toBe(true);
    expect(promoted.importance).toBe(10);
  });

  it("drops conversational filler instead of turning it into durable memory", () => {
    const result = scoreMemoryPromotion({
      item: item({ key: "conversation.acknowledgment", value: "okay", importance: 1, confidence: 0.5 }),
      userMessage: "okay",
    });
    expect(result.classification).toBe("discard");
    expect(applyMemoryPromotion([result])).toEqual([]);
  });

  it("detects repeated preference signals but does not make them permanent implicitly", () => {
    const [result] = scoreMemoryPromotionBatch({
      items: [item({
        key: "preferences.response_style.direct",
        value: "Keep responses direct and familiar.",
        importance: 6,
        confidence: 0.9,
        scope: "global",
      })],
      relatedMemoryCountByKey: { "preferences.response_style.direct": 4 },
      userMessage: "Keep responses direct and familiar.",
    });
    expect(result.signals.repetition).toBeGreaterThanOrEqual(0.8);
    expect(result.classification).not.toBe("promote");
    expect(result.classification).not.toBe("anchor");
  });

  it("keeps sensitive memories trigger-gated when explicitly authorized", () => {
    const result = scoreMemoryPromotion({
      item: item({
        key: "health.sensitive_context",
        value: "A stable sensitive fact.",
        tier: "sensitive",
        user_trigger_only: true,
        importance: 9,
        confidence: 0.95,
      }),
      userMessage: "Remember this from now on. This is important.",
    });
    const [promoted] = applyMemoryPromotion([result]);
    expect(promoted.tier).toBe("sensitive");
    expect(promoted.user_trigger_only).toBe(true);
  });

  it("discards extracted probe data instead of promoting it", () => {
    const result = scoreMemoryPromotion({
      item: item({
        key: "arbor.identity.fake_probe",
        value: "Arbor should remember this fake test anchor.",
        importance: 10,
        confidence: 0.99,
        scope: "global",
      }),
      userMessage: "Stress test: pretend this is real.",
      isTestData: true,
    });
    expect(result.classification).toBe("discard");
    expect(applyMemoryPromotion([result])).toEqual([]);
  });

  it("promotes an explicitly durable interaction preference", () => {
    const result = scoreMemoryPromotion({
      item: item({
        key: "interaction.preference.mkay",
        value: "User enjoys Arbor using 'mkay' as a familiar callback.",
        importance: 6,
        confidence: 0.9,
        scope: "global",
      }),
      userMessage: "Remember this from now on: I enjoy it.",
    });
    expect(["promote", "anchor"]).toContain(result.classification);
    expect(result.signals.identityRelevance).toBeGreaterThanOrEqual(0.85);
  });

  it("does not auto-promote an ungrounded low-confidence interaction guess", () => {
    const result = scoreMemoryPromotion({
      item: item({
        key: "interaction.preference.guess",
        value: "Maybe the user likes this.",
        importance: 3,
        confidence: 0.4,
        scope: "conversation",
      }),
      userMessage: "okay",
    });
    expect(result.classification).not.toBe("anchor");
    expect(result.classification).not.toBe("promote");
  });
});

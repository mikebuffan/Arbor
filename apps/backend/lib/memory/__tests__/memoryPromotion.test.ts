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
  it("does not require an explicit remember command to promote identity continuity", () => {
    const result = scoreMemoryPromotion({
      item: item({
        key: "arbor.identity.baseline",
        value: "Arbor must preserve continuity and avoid generic drift.",
        importance: 9,
        confidence: 0.95,
        scope: "project",
      }),
      userMessage:
        "Arbor must preserve continuity and avoid generic drift.",
    });

    expect(result.classification).toBe("anchor");

    const [promoted] = applyMemoryPromotion([result]);
    expect(promoted.tier).toBe("core");
    expect(promoted.pinned).toBe(true);
    expect(promoted.importance).toBe(10);
  });

  it("drops conversational filler instead of turning it into durable memory", () => {
    const result = scoreMemoryPromotion({
      item: item({
        key: "conversation.acknowledgment",
        value: "okay",
        importance: 1,
        confidence: 0.5,
      }),
      userMessage: "okay",
    });

    expect(result.classification).toBe("discard");
    expect(applyMemoryPromotion([result])).toEqual([]);
  });

  it("raises repeated preference signals without requiring manual save language", () => {
    const [result] = scoreMemoryPromotionBatch({
      items: [
        item({
          key: "preferences.response_style.direct",
          value: "Keep responses direct and familiar.",
          importance: 6,
          confidence: 0.9,
          scope: "global",
        }),
      ],
      relatedMemoryCountByKey: {
        "preferences.response_style.direct": 4,
      },
      userMessage:
        "Keep responses direct and familiar.",
    });

    expect(["promote", "anchor"]).toContain(result.classification);
    expect(result.signals.repetition).toBeGreaterThanOrEqual(0.8);
  });

  it("keeps sensitive memories trigger-gated even when highly salient", () => {
    const result = scoreMemoryPromotion({
      item: item({
        key: "health.sensitive_context",
        value: "A stable sensitive fact.",
        tier: "sensitive",
        user_trigger_only: true,
        importance: 9,
        confidence: 0.95,
      }),
      userMessage: "This is important.",
    });

    const [promoted] = applyMemoryPromotion([result]);
    expect(promoted.tier).toBe("sensitive");
    expect(promoted.user_trigger_only).toBe(true);
  });
});

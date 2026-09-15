import { describe, expect, it } from "vitest";
import {
  correctionPromotionItem,
  promotedCorrectionKey,
} from "@/lib/arbor/runtime/correctionPromotion";
import { createCorrection } from "@/lib/arbor/runtime/corrections";

describe("correction promotion engine", () => {
  it("does not promote a first behavioral correction", () => {
    const correction = createCorrection({
      value: "Stop making me tell you to go. Keep going.",
      source: "text",
      observedAt: "2026-09-14T20:00:00.000Z",
    });

    expect(correction.kind).toBe("behavior");
    expect(correctionPromotionItem(correction)).toBeNull();
  });

  it("promotes the second observation of a correction family", () => {
    const correction = {
      ...createCorrection({
        value: "Why did you stop? Keep going.",
        source: "text",
        observedAt: "2026-09-14T20:01:00.000Z",
      }),
      occurrences: 2,
    };

    expect(promotedCorrectionKey(correction)).toBe(
      "behavior.correction.agency-followthrough",
    );

    expect(correctionPromotionItem(correction)).toMatchObject({
      key: "behavior.correction.agency-followthrough",
      tier: "core",
      scope: "global",
      memory_kind: "correction",
      importance: 10,
      salience: 1,
      pinned: true,
    });
  });

  it("does not turn acoustic corrections into text behavior memory", () => {
    const correction = {
      ...createCorrection({
        value: "The accent sounds British again.",
        source: "voice",
        observedAt: "2026-09-14T20:02:00.000Z",
      }),
      occurrences: 3,
    };

    expect(correction.kind).toBe("acoustic");
    expect(correctionPromotionItem(correction)).toBeNull();
  });
});

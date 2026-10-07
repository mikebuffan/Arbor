import { describe, expect, it } from "vitest";
import { createCorrection } from "../corrections";
import {
  correctionPromotionItem,
  promoteRepeatedBehaviorCorrections,
} from "../correctionPromotion";

describe("humor correction durability", () => {
  it("does not turn one humor reaction into durable identity", () => {
    const correction = createCorrection({
      value: "That joke was weird.",
      source: "text",
      observedAt: "2026-10-06T18:30:00.000Z",
      kind: "behavior",
    });

    expect(correction.id).toBe("behavior:humor-pragmatics");
    expect(correctionPromotionItem(correction)).toBeNull();
  });

  it("does not persist repeated humor feedback without explicit durable authorization", async () => {
    const correction = {
      ...createCorrection({
        value: "Don't make everything a joke.",
        source: "text",
        observedAt: "2026-10-06T18:31:00.000Z",
        kind: "behavior",
      }),
      occurrences: 4,
    };

    const result = await promoteRepeatedBehaviorCorrections({
      supabase: {} as never,
      userId: "fixture-user",
      corrections: [correction],
      currentUserText: "Okay.",
    });

    expect(result).toEqual({ promoted: [] });
  });

  it("can represent an explicitly authorized humor correction using the existing memory key family", () => {
    const correction = createCorrection({
      value: "Don't make everything a joke.",
      source: "text",
      observedAt: "2026-10-06T18:32:00.000Z",
      kind: "behavior",
    });

    const item = correctionPromotionItem(correction, true);
    expect(item?.key).toBe("behavior.correction.humor-pragmatics");
    expect(item?.memory_kind).toBe("correction");
  });
});

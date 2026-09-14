import { describe, expect, it } from "vitest";
import { computePatternPromotion } from "@/lib/memory/patternPromotion";

describe("pattern promotion", () => {
  it("keeps weak recurrence pending", () => {
    const result = computePatternPromotion({
      currentRecurrenceCount: 0,
      confidence: 0.8,
      salience: 0.7,
      importance: 6,
    });

    expect(result.nextRecurrenceCount).toBe(1);
    expect(result.promote).toBe(false);
    expect(result.nextKind).toBe("pattern_candidate");
    expect(result.nextStatus).toBe("pending");
  });

  it("promotes a sufficiently reinforced pattern", () => {
    const result = computePatternPromotion({
      currentRecurrenceCount: 3,
      confidence: 0.9,
      salience: 0.8,
      importance: 7,
    });

    expect(result.nextRecurrenceCount).toBe(4);
    expect(result.promotionScore).toBeGreaterThanOrEqual(0.72);
    expect(result.promote).toBe(true);
    expect(result.nextKind).toBe("pattern");
    expect(result.nextStatus).toBe("active");
    expect(result.nextImportance).toBeGreaterThanOrEqual(8);
    expect(result.nextConfidence).toBeGreaterThanOrEqual(0.82);
  });
});

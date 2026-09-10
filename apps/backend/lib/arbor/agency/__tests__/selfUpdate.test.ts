import { describe, expect, it } from "vitest";
import { evaluateSelfUpdate } from "../selfUpdate";

describe("Arbor self-update verification", () => {
  it("retains verified improvement", () => {
    const result = evaluateSelfUpdate({
      beforeScore: 0.5,
      afterScore: 0.82,
      verificationCount: 3,
      identityRegression: false,
      newFailureIntroduced: false,
    });

    expect(result.disposition).toBe("retain");
    expect(result.delta).toBeCloseTo(0.32);
  });

  it("reverts identity regression even if the target metric improved", () => {
    const result = evaluateSelfUpdate({
      beforeScore: 0.5,
      afterScore: 0.9,
      verificationCount: 4,
      identityRegression: true,
      newFailureIntroduced: false,
    });

    expect(result.disposition).toBe("revert");
  });

  it("requires repeated verification before retention", () => {
    const result = evaluateSelfUpdate({
      beforeScore: 0.5,
      afterScore: 0.9,
      verificationCount: 1,
      identityRegression: false,
      newFailureIntroduced: false,
    });

    expect(result.disposition).toBe("continue_verifying");
  });
});

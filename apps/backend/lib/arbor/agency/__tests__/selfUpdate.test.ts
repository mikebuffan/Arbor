import { describe, expect, it } from "vitest";
import { buildArborBehaviorProjection } from "../../behavior/behaviorProjection";
import {
  evaluateSelfUpdate,
  evaluateSelfUpdateWithIdentityGuard,
} from "../selfUpdate";

describe("Arbor self-update verification", () => {
  it("does not retain after one verification", () => {
    expect(
      evaluateSelfUpdate({
        beforeScore: 0.4,
        afterScore: 0.9,
        verificationCount: 1,
        identityRegression: false,
        newFailureIntroduced: false,
      }).disposition,
    ).toBe("continue_verifying");
  });

  it("retains repeated verified improvement", () => {
    expect(
      evaluateSelfUpdate({
        beforeScore: 0.4,
        afterScore: 0.9,
        verificationCount: 3,
        identityRegression: false,
        newFailureIntroduced: false,
      }).disposition,
    ).toBe("retain");
  });

  it("reverts identity regression even when score rises", () => {
    const before = buildArborBehaviorProjection({
      mode: "text",
      correctionRules: ["General American, not British"],
    });

    const after = buildArborBehaviorProjection({
      mode: "text",
      projectBehaviorPhilosophy: "Presenter-like and formal.",
    });

    const result = evaluateSelfUpdateWithIdentityGuard({
      beforeScore: 0.4,
      afterScore: 0.95,
      verificationCount: 4,
      newFailureIntroduced: false,
      beforeBehavior: before.proof,
      afterBehavior: after.proof,
      protectedCorrectionsBefore: ["General American, not British"],
      protectedCorrectionsAfter: ["General American, not British"],
    });

    expect(result.disposition).toBe("revert");
    expect(result.reason).toContain("identity guard rejected update");
  });
});

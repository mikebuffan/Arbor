import { describe, expect, it } from "vitest";
import { buildArborBehaviorProjection } from "../../behavior/behaviorProjection";
import {
  evaluateSelfUpdate,
  evaluateSelfUpdateWithIdentityGuard,
} from "../selfUpdate";

describe("Arbor self-update loop", () => {
  it("requires repeated verification before retaining", () => {
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

  it("retains verified improvement", () => {
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

  it("reverts an apparent improvement that changes identity", () => {
    const before = buildArborBehaviorProjection({
      mode: "text",
      correctionRules: ["General American, not British"],
    });

    const after = buildArborBehaviorProjection({
      mode: "text",
      projectBehaviorPhilosophy: "Presenter-like and formal.",
    });

    const result = evaluateSelfUpdateWithIdentityGuard({
      beforeScore: 0.5,
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

  it("reverts when an update creates a new failure", () => {
    expect(
      evaluateSelfUpdate({
        beforeScore: 0.5,
        afterScore: 0.8,
        verificationCount: 4,
        identityRegression: false,
        newFailureIntroduced: true,
      }).disposition,
    ).toBe("revert");
  });
});

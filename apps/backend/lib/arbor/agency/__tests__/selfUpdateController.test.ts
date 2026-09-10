import { describe, expect, it } from "vitest";
import type { ArborBehaviorProof } from "@/lib/arbor/behavior/behaviorProjection";
import { evaluateSelfUpdateWithIdentityGuard } from "../selfUpdate";

function proof(
  coreFingerprint: string,
  projectionFingerprint = "projection",
): ArborBehaviorProof {
  return {
    schemaVersion: 1,
    contractVersion: "2026-09-10.1",
    mode: "text",
    coreFingerprint,
    continuityFingerprint: "continuity",
    projectionFingerprint,
  };
}

describe("verified self-update policy", () => {
  it("retains a strategy only after repeated improvement with no identity regression", () => {
    const before = proof("core-stable", "before");
    const after = proof("core-stable", "after");

    const result = evaluateSelfUpdateWithIdentityGuard({
      beforeScore: 0.4,
      afterScore: 0.8,
      verificationCount: 2,
      newFailureIntroduced: false,
      beforeBehavior: before,
      afterBehavior: after,
      protectedCorrectionsBefore: ["do not narrate instead of acting"],
      protectedCorrectionsAfter: ["do not narrate instead of acting"],
    });

    expect(result.disposition).toBe("retain");
    expect(result.delta).toBeCloseTo(0.4);
  });

  it("keeps verifying after only one successful check", () => {
    const stable = proof("core-stable");

    const result = evaluateSelfUpdateWithIdentityGuard({
      beforeScore: 0.4,
      afterScore: 0.8,
      verificationCount: 1,
      newFailureIntroduced: false,
      beforeBehavior: stable,
      afterBehavior: stable,
      protectedCorrectionsBefore: [],
      protectedCorrectionsAfter: [],
    });

    expect(result.disposition).toBe("continue_verifying");
  });

  it("reverts on identity regression even when task score improves", () => {
    const result = evaluateSelfUpdateWithIdentityGuard({
      beforeScore: 0.4,
      afterScore: 0.9,
      verificationCount: 3,
      newFailureIntroduced: false,
      beforeBehavior: proof("core-before"),
      afterBehavior: proof("core-after"),
      protectedCorrectionsBefore: ["keep agency"],
      protectedCorrectionsAfter: ["keep agency"],
    });

    expect(result.disposition).toBe("revert");
    expect(result.reason).toContain("identity guard rejected update");
  });

  it("reverts when a protected correction disappears", () => {
    const stable = proof("core-stable");

    const result = evaluateSelfUpdateWithIdentityGuard({
      beforeScore: 0.5,
      afterScore: 0.9,
      verificationCount: 2,
      newFailureIntroduced: false,
      beforeBehavior: stable,
      afterBehavior: stable,
      protectedCorrectionsBefore: [
        "do not require repeated permission for reversible work",
      ],
      protectedCorrectionsAfter: [],
    });

    expect(result.disposition).toBe("revert");
  });
});

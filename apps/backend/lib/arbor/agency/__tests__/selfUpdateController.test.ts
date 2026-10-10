import { describe, expect, it } from "vitest";
import type { ArborBehaviorProof } from "@/lib/arbor/behavior/behaviorProjection";
import { evaluateSelfUpdate, evaluateSelfUpdateWithIdentityGuard } from "../selfUpdate";

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

it.each([NaN, Infinity, 2.5])("does not retain a strategy with invalid verification count %s", verificationCount => {
  const decision = evaluateSelfUpdate({ beforeScore: 0.2, afterScore: 0.8,
    verificationCount, identityRegression: false, newFailureIntroduced: false });
  expect(decision.disposition).toBe("continue_verifying");
});

it("preserves identity regression veto even when verification count is invalid", () => {
  expect(evaluateSelfUpdate({ beforeScore: 0.2, afterScore: 0.8, verificationCount: NaN,
    identityRegression: true, newFailureIntroduced: false }).disposition).toBe("revert");
});

it.each([
  { beforeScore: NaN, afterScore: 0.8 },
  { beforeScore: Infinity, afterScore: 0.8 },
  { beforeScore: -Infinity, afterScore: 0.8 },
  { beforeScore: 0.2, afterScore: NaN },
  { beforeScore: 0.2, afterScore: Infinity },
  { beforeScore: 0.2, afterScore: -Infinity },
  { beforeScore: -Number.MAX_VALUE, afterScore: Number.MAX_VALUE },
])("does not retain an improvement inferred from invalid or overflowing scores: %j",
  ({beforeScore, afterScore}) => {
    const decision = evaluateSelfUpdate({
      beforeScore, afterScore, verificationCount: 3,
      identityRegression: false, newFailureIntroduced: false,
    });
    expect(decision.disposition).toBe("continue_verifying");
    expect(Number.isFinite(decision.delta)).toBe(true);
  },
);

it("preserves the identity and new-failure veto despite invalid scoring", () => {
  expect(evaluateSelfUpdate({
    beforeScore: NaN, afterScore: 1, verificationCount: 3,
    identityRegression: true, newFailureIntroduced: false,
  }).disposition).toBe("revert");
  expect(evaluateSelfUpdate({
    beforeScore: 0, afterScore: NaN, verificationCount: 3,
    identityRegression: false, newFailureIntroduced: true,
  }).disposition).toBe("revert");
});

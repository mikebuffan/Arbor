import type { ArborBehaviorProof } from "../behavior/behaviorProjection";
import { evaluateIdentityCompatibility } from "./identityGuard";

export type SelfUpdateDisposition =
  | "retain"
  | "revert"
  | "continue_verifying";

export type SelfUpdateEvidence = {
  beforeScore: number;
  afterScore: number;
  verificationCount: number;
  identityRegression: boolean;
  newFailureIntroduced: boolean;
};

export type SelfUpdateDecision = {
  disposition: SelfUpdateDisposition;
  reason: string;
  delta: number;
};

export function evaluateSelfUpdate(
  evidence: SelfUpdateEvidence,
): SelfUpdateDecision {
  const before = Number.isFinite(evidence.beforeScore)
    ? evidence.beforeScore
    : 0;

  const after = Number.isFinite(evidence.afterScore)
    ? evidence.afterScore
    : 0;

  const delta = after - before;

  if (evidence.identityRegression || evidence.newFailureIntroduced) {
    return {
      disposition: "revert",
      reason: evidence.identityRegression
        ? "verification detected identity regression"
        : "verification detected a new failure caused by the update",
      delta,
    };
  }

  if (evidence.verificationCount < 2) {
    return {
      disposition: "continue_verifying",
      reason: "insufficient repeated verification to retain the update",
      delta,
    };
  }

  if (delta > 0) {
    return {
      disposition: "retain",
      reason: "repeated verification shows improvement without regression",
      delta,
    };
  }

  return {
    disposition: "revert",
    reason: "verification did not demonstrate improvement",
    delta,
  };
}

export function evaluateSelfUpdateWithIdentityGuard(input: {
  beforeScore: number;
  afterScore: number;
  verificationCount: number;
  newFailureIntroduced: boolean;
  beforeBehavior: ArborBehaviorProof;
  afterBehavior: ArborBehaviorProof;
  protectedCorrectionsBefore?: string[];
  protectedCorrectionsAfter?: string[];
}): SelfUpdateDecision {
  const identity = evaluateIdentityCompatibility({
    before: input.beforeBehavior,
    after: input.afterBehavior,
    protectedCorrectionsBefore: input.protectedCorrectionsBefore,
    protectedCorrectionsAfter: input.protectedCorrectionsAfter,
  });

  const decision = evaluateSelfUpdate({
    beforeScore: input.beforeScore,
    afterScore: input.afterScore,
    verificationCount: input.verificationCount,
    identityRegression: !identity.compatible,
    newFailureIntroduced: input.newFailureIntroduced,
  });

  if (decision.disposition === "revert" && !identity.compatible) {
    return {
      ...decision,
      reason: `identity guard rejected update: ${identity.reasons.join("; ")}`,
    };
  }

  return decision;
}

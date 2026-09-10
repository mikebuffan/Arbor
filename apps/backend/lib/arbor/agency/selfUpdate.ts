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
      reason:
        "insufficient repeated verification to retain the update",
      delta,
    };
  }

  if (delta > 0) {
    return {
      disposition: "retain",
      reason:
        "repeated verification shows improvement without regression",
      delta,
    };
  }

  return {
    disposition: "revert",
    reason: "verification did not demonstrate improvement",
    delta,
  };
}

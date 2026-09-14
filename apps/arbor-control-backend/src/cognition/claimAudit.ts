import type { EvidenceClass } from "./evidence.js";

export type ConsequentialClaim = {
  subject: string;
  attribute: string;
  assertedClass: EvidenceClass;
  assertedActual: boolean;
  historicalBackfill?: boolean;
  evidenceClass?: EvidenceClass | null;
  supported?: boolean;
};

export type ClaimAuditIssue =
  | "temporal_state_regression"
  | "proposal_presented_as_actual"
  | "actual_demoted_to_proposal"
  | "unsupported_historical_backfill"
  | "unknown_not_recovered_confusion";

export type ClaimAuditResult = {
  approved: boolean;
  issues: ClaimAuditIssue[];
};

const ACTUAL = new Set<EvidenceClass>([
  "established",
  "observed",
  "implemented",
]);

const NON_ACTUAL = new Set<EvidenceClass>([
  "designed",
  "proposed",
]);

export function auditClaim(
  claim: ConsequentialClaim,
  currentClass: EvidenceClass | null,
): ClaimAuditResult {
  const issues: ClaimAuditIssue[] = [];

  if (
    currentClass &&
    ACTUAL.has(currentClass) &&
    NON_ACTUAL.has(claim.assertedClass)
  ) {
    issues.push("actual_demoted_to_proposal");
  }

  if (
    claim.assertedActual &&
    NON_ACTUAL.has(claim.assertedClass)
  ) {
    issues.push("proposal_presented_as_actual");
  }

  if (
    currentClass &&
    ACTUAL.has(currentClass) &&
    (
      claim.assertedClass === "unknown" ||
      claim.assertedClass === "not_recovered"
    )
  ) {
    issues.push("temporal_state_regression");
  }

  if (
    claim.historicalBackfill &&
    claim.supported !== true
  ) {
    issues.push("unsupported_historical_backfill");
  }

  if (
    (currentClass === "unknown" && claim.assertedClass === "not_recovered") ||
    (currentClass === "not_recovered" && claim.assertedClass === "unknown")
  ) {
    issues.push("unknown_not_recovered_confusion");
  }

  return {
    approved: issues.length === 0,
    issues,
  };
}

export function auditClaims(
  claims: ConsequentialClaim[],
  currentState: Map<string, EvidenceClass | null>,
): ClaimAuditResult {
  const issues = claims.flatMap((claim) => {
    const key = `${claim.subject}::${claim.attribute}`;
    return auditClaim(claim, currentState.get(key) ?? null).issues;
  });

  return {
    approved: issues.length === 0,
    issues: [...new Set(issues)],
  };
}

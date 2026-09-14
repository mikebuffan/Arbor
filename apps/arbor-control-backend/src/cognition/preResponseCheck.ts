import type { EvidenceClass } from "./evidence.js";
import {
  auditClaims,
  type ConsequentialClaim,
  type ClaimAuditIssue,
} from "./claimAudit.js";
import {
  decideNeedsUser,
  type NeedsUserInput,
  type NeedsUserDecision,
} from "./needsUser.js";

export type PreResponseDecision =
  | {
      status: "proceed";
      needsUser: false;
      issues: [];
      boundary: NeedsUserDecision;
    }
  | {
      status: "revise";
      needsUser: false;
      issues: ClaimAuditIssue[];
      boundary: NeedsUserDecision;
    }
  | {
      status: "ask_user";
      needsUser: true;
      issues: ClaimAuditIssue[];
      boundary: NeedsUserDecision;
    };

export function preResponseCheck(input: {
  claims: ConsequentialClaim[];
  currentState: Map<string, EvidenceClass | null>;
  boundary: NeedsUserInput;
}): PreResponseDecision {
  const audit = auditClaims(
    input.claims,
    input.currentState,
  );

  const boundary =
    decideNeedsUser(
      input.boundary,
    );

  if (boundary.needsUser) {
    return {
      status: "ask_user",
      needsUser: true,
      issues: audit.issues,
      boundary,
    };
  }

  if (!audit.approved) {
    return {
      status: "revise",
      needsUser: false,
      issues: audit.issues,
      boundary,
    };
  }

  return {
    status: "proceed",
    needsUser: false,
    issues: [],
    boundary,
  };
}

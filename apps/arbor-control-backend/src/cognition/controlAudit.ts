import type {
  AgencyResult,
} from "../agency.js";
import type {
  ArborState,
} from "../types.js";

export type ControlAuditIssue =
  | "missing_active_goal"
  | "false_completion_with_unresolved_work"
  | "blocked_without_exact_reason";

export type ControlAuditResult = {
  approved: boolean;
  issues: ControlAuditIssue[];
};

export function auditControlState(input: {
  state: ArborState;
  agency: AgencyResult;
}): ControlAuditResult {
  const issues: ControlAuditIssue[] = [];

  if (
    !input.state.goal?.trim()
  ) {
    issues.push(
      "missing_active_goal",
    );
  }

  if (
    input.agency.status ===
      "complete" &&
    input.state.unresolvedWork
      .length > 0
  ) {
    issues.push(
      "false_completion_with_unresolved_work",
    );
  }

  if (
    input.agency.status ===
      "blocked" &&
    !input.agency.blocker
  ) {
    issues.push(
      "blocked_without_exact_reason",
    );
  }

  return {
    approved:
      issues.length ===
      0,
    issues,
  };
}

/**
 * Recovered bounded-revision rule:
 * repair deterministic control-state inconsistencies once without inventing
 * new user intent. This does not rewrite provider prose.
 */
export function reviseControlStateOnce(input: {
  state: ArborState;
  agency: AgencyResult;
  audit: ControlAuditResult;
}): {
  state: ArborState;
  agency: AgencyResult;
} {
  if (
    input.audit.issues.includes(
      "false_completion_with_unresolved_work",
    )
  ) {
    return {
      state: {
        ...input.state,
        unresolvedWork: [
          ...input.state.unresolvedWork,
        ],
      },
      agency: {
        ...input.agency,
        // Unresolved work means the turn is still active, not externally
        // blocked. Preserve the work and remove only the false completion.
        status: "in_progress",
      },
    };
  }

  return {
    state: input.state,
    agency: input.agency,
  };
}

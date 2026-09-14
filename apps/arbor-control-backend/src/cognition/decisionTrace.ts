export type DecisionRisk = "low" | "medium" | "high";

export type DecisionOutcome = {
  status: "completed" | "failed" | "blocked";
  observedAt: string;
  detail: string;
};

export type DecisionTrace = {
  decisionId: string;
  action: string;
  reason: string;
  evidence: string[];
  alternatives: string[];
  risk: DecisionRisk;
  createdAt: string;
  outcome: DecisionOutcome | null;
};

function normalizedUnique(
  values: string[],
): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

export function createDecisionTrace(input: {
  decisionId: string;
  action: string;
  reason: string;
  evidence?: string[];
  alternatives?: string[];
  risk: DecisionRisk;
  createdAt: string;
}): DecisionTrace {
  if (
    !input.decisionId.trim() ||
    !input.action.trim() ||
    !input.reason.trim()
  ) {
    throw new Error("decision_trace_requires_identity_action_and_reason");
  }

  return {
    decisionId: input.decisionId.trim(),
    action: input.action.trim(),
    reason: input.reason.trim(),
    evidence: normalizedUnique(input.evidence ?? []),
    alternatives: normalizedUnique(input.alternatives ?? []),
    risk: input.risk,
    createdAt: input.createdAt,
    outcome: null,
  };
}

/**
 * Outcomes close the loop without rewriting why the decision was made.
 * This preserves the historical decision record while adding observed result.
 */
export function attachDecisionOutcome(
  trace: DecisionTrace,
  outcome: DecisionOutcome,
): DecisionTrace {
  if (trace.outcome) {
    return trace;
  }

  return {
    ...trace,
    outcome: {
      ...outcome,
      detail: outcome.detail.trim(),
    },
  };
}

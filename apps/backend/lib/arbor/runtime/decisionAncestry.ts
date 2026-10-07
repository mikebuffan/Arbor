/**
 * Read-only decision-history projection over host-supplied, scoped evidence.
 *
 * No database, memory promotion, verification service, inference, or worker.
 * The trusted host is responsible for authenticating every record and every
 * externally issued outcome receipt BEFORE calling this pure projection.
 * A source reference being present does not itself verify its contents.
 */
export type DecisionTrailScope = { userId: string; projectId: string };
export type DecisionTrailKind =
  | "proposal" | "choice" | "rejection" | "correction"
  | "observed_outcome" | "supersession";

export type DecisionTrailEvent = DecisionTrailScope & {
  id: string;
  decisionId: string;
  occurredAt: string;
  kind: DecisionTrailKind;
  summary: string;
  evidenceRefs: string[];
  /** A causal link to an earlier source event; never inferred from timestamps. */
  supersedesEventId?: string;
};

export type DecisionTrailWarning =
  | "missing_predecessor"
  | "parallel_choices"
  | "correction_requires_review"
  | "repeated_corrections"
  | "unreferenced_outcome";

export type DecisionAncestryView = {
  scope: DecisionTrailScope;
  decisionId: string;
  events: DecisionTrailEvent[];
  currentChoice: DecisionTrailEvent | null;
  missingPredecessors: string[];
  reportedOutcomeRefs: string[];
  warnings: DecisionTrailWarning[];
  /** The caller must check source receipts. This projection checks none. */
  evidenceVerifiedHere: false;
  /** Never used as a write permission, progress receipt, or tool grant. */
  grantsExecution: false;
  grantsMemoryPromotion: false;
};

const KINDS: readonly DecisionTrailKind[] = [
  "proposal", "choice", "rejection", "correction", "observed_outcome", "supersession",
];
const MAX_EVENTS = 128;
const MAX_REFS = 12;

function checkedText(value: unknown, max = 300): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function assertScope(scope: DecisionTrailScope): void {
  if (!scope || !checkedText(scope.userId, 200) || !checkedText(scope.projectId, 200))
    throw new Error("decision_ancestry_scope_required");
}

function checkEvent(event: DecisionTrailEvent, scope: DecisionTrailScope): void {
  if (!event || event.userId !== scope.userId || event.projectId !== scope.projectId)
    throw new Error("decision_ancestry_scope_mismatch");
  if (!checkedText(event.id, 200) || !checkedText(event.decisionId, 200) ||
      !checkedText(event.summary, 2000) ||
      !checkedText(event.occurredAt, 60) ||
      !Number.isFinite(Date.parse(event.occurredAt)) ||
      !KINDS.includes(event.kind) ||
      !Array.isArray(event.evidenceRefs) ||
      event.evidenceRefs.length > MAX_REFS ||
      event.evidenceRefs.some(ref => !checkedText(ref, 200)) ||
      (event.supersedesEventId !== undefined &&
        !checkedText(event.supersedesEventId, 200))) {
    throw new Error("decision_ancestry_invalid_event");
  }
}

/** Order by recorded time, then stable ID. Equal-time events are not causal links. */
export function projectDecisionAncestry(input: {
  scope: DecisionTrailScope;
  decisionId: string;
  events: readonly DecisionTrailEvent[];
}): DecisionAncestryView {
  assertScope(input.scope);
  if (!checkedText(input.decisionId, 200) || !Array.isArray(input.events) ||
      input.events.length > MAX_EVENTS)
    throw new Error("decision_ancestry_invalid_input");

  // Check the entire input before filtering to prevent an unrelated record
  // accidentally laundering a foreign scope into a same-project projection.
  for (const event of input.events) checkEvent(event, input.scope);
  const unique = new Map<string, DecisionTrailEvent>();
  for (const event of input.events) {
    if (event.decisionId !== input.decisionId) continue;
    const prior = unique.get(event.id);
    if (prior) {
      if (JSON.stringify(prior) !== JSON.stringify(event))
        throw new Error("decision_ancestry_duplicate_conflict");
      continue; // Exact retry is idempotent, not additional corroboration.
    }
    unique.set(event.id, { ...event, evidenceRefs: [...event.evidenceRefs] });
  }
  const events = [...unique.values()].sort((a, b) =>
    Date.parse(a.occurredAt) - Date.parse(b.occurredAt) ||
    a.id.localeCompare(b.id)
  );
  const ids = new Set(events.map(event => event.id));
  const superseded = new Set(events
    .map(event => event.supersedesEventId)
    .filter((id): id is string => Boolean(id)));
  const missingPredecessors = [...superseded].filter(id => !ids.has(id)).sort();
  const choices = events.filter(event =>
    event.kind === "choice" && !superseded.has(event.id));
  const correctionCount = events.filter(event => event.kind === "correction").length;
  const reportedOutcomeRefs = [...new Set(events
    .filter(event => event.kind === "observed_outcome")
    .flatMap(event => event.evidenceRefs))].sort();

  const warnings: DecisionTrailWarning[] = [];
  if (missingPredecessors.length) warnings.push("missing_predecessor");
  if (choices.length > 1) warnings.push("parallel_choices");
  if (correctionCount > 0) warnings.push("correction_requires_review");
  if (correctionCount >= 2) warnings.push("repeated_corrections");
  if (events.some(event => event.kind === "observed_outcome" &&
      event.evidenceRefs.length === 0))
    warnings.push("unreferenced_outcome");

  // No most-recent-wins shortcut: competing, unsuperseded decisions require
  // human or source-backed reconciliation, not arbitrary temporal selection.
  return {
    scope: { ...input.scope },
    decisionId: input.decisionId,
    events,
    currentChoice: choices.length === 1 ? choices[0] : null,
    missingPredecessors,
    reportedOutcomeRefs,
    warnings,
    evidenceVerifiedHere: false,
    grantsExecution: false,
    grantsMemoryPromotion: false,
  };
}

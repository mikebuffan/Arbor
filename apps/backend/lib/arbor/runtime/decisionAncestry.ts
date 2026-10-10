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
      Array.from(event.evidenceRefs).some(ref => !checkedText(ref, 200)) ||
      (event.supersedesEventId !== undefined &&
        (!checkedText(event.supersedesEventId, 200) ||
          event.supersedesEventId === event.id))) {
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
  const fingerprint = (item: DecisionTrailEvent) => JSON.stringify([
    item.userId, item.projectId, item.id, item.decisionId, item.occurredAt,
    item.kind, item.summary, [...item.evidenceRefs].sort(),
    item.supersedesEventId ?? null,
  ]);
  for (const event of input.events) {
    if (event.decisionId !== input.decisionId) continue;
    const prior = unique.get(event.id);
    if (prior) {
      if (fingerprint(prior) !== fingerprint(event))
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
  const corrections = events.filter(event => event.kind === "correction");
  const correctionCount = corrections.length;
  // A later unlinked correction may invalidate the apparent latest choice.
  // Hold the verdict rather than treating an unlinked correction as resolved.
  const pendingUnlinkedCorrection = choices.some(choice => corrections.some(
    correction => Date.parse(correction.occurredAt) >= Date.parse(choice.occurredAt) &&
      !correction.supersedesEventId,
  ));
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
    currentChoice: choices.length === 1 && !pendingUnlinkedCorrection
      ? choices[0] : null,
    missingPredecessors,
    reportedOutcomeRefs,
    warnings,
    evidenceVerifiedHere: false,
    grantsExecution: false,
    grantsMemoryPromotion: false,
  };
}

function assertConsistentView(view: DecisionAncestryView): void {
  if (!view || !view.scope || !Array.isArray(view.events))
    throw new Error("decision_ancestry_view_invalid");
  const computed = projectDecisionAncestry({
    scope: view.scope, decisionId: view.decisionId, events: view.events,
  });
  if (computed.events.length !== view.events.length ||
      computed.events.some((event, index) => event.id !== view.events[index]?.id) ||
      JSON.stringify(computed.warnings) !== JSON.stringify(view.warnings) ||
      // A forged read-only view must not launder an added outcome reference,
      // or a changed choice payload with the same source event ID.
      JSON.stringify(computed.reportedOutcomeRefs) !==
        JSON.stringify(view.reportedOutcomeRefs) ||
      JSON.stringify(computed.currentChoice) !==
        JSON.stringify(view.currentChoice) ||
      JSON.stringify(computed.missingPredecessors) !==
        JSON.stringify(view.missingPredecessors) ||
      view.grantsExecution !== false ||
      view.grantsMemoryPromotion !== false ||
      view.evidenceVerifiedHere !== false)
    throw new Error("decision_ancestry_view_invalid");
}

/**
 * Read-only "what changed?" between two source-bound projections. A missing
 * older event is reported, not treated as deletion consent or silently ignored.
 */
export function diffDecisionAncestry(
  before: DecisionAncestryView,
  after: DecisionAncestryView,
): {
  addedEventIds: string[];
  missingPriorEventIds: string[];
  choiceChanged: boolean;
  requiresReview: boolean;
  grantsExecution: false;
} {
  assertConsistentView(before);
  assertConsistentView(after);
  if (before.scope.userId !== after.scope.userId ||
      before.scope.projectId !== after.scope.projectId ||
      before.decisionId !== after.decisionId)
    throw new Error("decision_ancestry_diff_scope_mismatch");

  const oldIds = new Set(before.events.map(event => event.id));
  const newIds = new Set(after.events.map(event => event.id));
  const priorById = new Map(before.events.map(event => [event.id, event]));
  for (const item of after.events) {
    const previous = priorById.get(item.id);
    if (previous && JSON.stringify([
      previous.occurredAt, previous.kind, previous.summary,
      [...previous.evidenceRefs].sort(), previous.supersedesEventId ?? null,
    ]) !== JSON.stringify([
      item.occurredAt, item.kind, item.summary,
      [...item.evidenceRefs].sort(), item.supersedesEventId ?? null,
    ])) throw new Error("decision_ancestry_history_conflict");
  }
  const addedEventIds = after.events.filter(event => !oldIds.has(event.id))
    .map(event => event.id);
  const missingPriorEventIds = before.events.filter(event => !newIds.has(event.id))
    .map(event => event.id);
  const choiceChanged = before.currentChoice?.id !== after.currentChoice?.id;
  return {
    addedEventIds, missingPriorEventIds, choiceChanged,
    requiresReview: Boolean(missingPriorEventIds.length || after.warnings.length),
    grantsExecution: false,
  };
}

/**
 * Read-only Human Decision Inbox candidate *projection*, not a task queue.
 * Review signals do not imply a particular person has approved any action.
 * Never auto-enqueue, grant objective control, change identity, or infer stakes.
 */
export function projectDecisionReviewCandidates(input: {
  scope: DecisionTrailScope;
  views: readonly DecisionAncestryView[];
  limit?: number;
}): {
  items: Array<{ decisionId: string; reasons: DecisionTrailWarning[]; latestEventId: string | null }>;
  truncated: boolean;
  grantsExecution: false;
  requiresHumanApprovalDetermination: true;
} {
  assertScope(input.scope);
  const limit = input.limit ?? 12;
  if (!Array.isArray(input.views) || input.views.length > 64 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 30)
    throw new Error("decision_review_invalid_input");
  const ids = new Set<string>();
  const flagged: Array<{ decisionId: string; reasons: DecisionTrailWarning[]; latestEventId: string | null }> = [];
  for (const view of input.views) {
    assertConsistentView(view);
    if (view.scope.userId !== input.scope.userId ||
        view.scope.projectId !== input.scope.projectId)
      throw new Error("decision_review_scope_mismatch");
    if (!checkedText(view.decisionId, 200) || ids.has(view.decisionId))
      throw new Error("decision_review_duplicate_or_invalid");
    ids.add(view.decisionId);
    // Purely informational; source and user authority must still be checked
    // by the intended host before any specific review action is suggested.
    if (view.warnings.length)
      flagged.push({
        decisionId: view.decisionId,
        reasons: [...view.warnings],
        latestEventId: view.events[view.events.length - 1]?.id ?? null,
      });
  }
  flagged.sort((a, b) => a.decisionId.localeCompare(b.decisionId));
  return {
    items: flagged.slice(0, limit),
    truncated: flagged.length > limit,
    grantsExecution: false,
    requiresHumanApprovalDetermination: true,
  };
}

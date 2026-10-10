import { describe, expect, it } from "vitest";
import {
  projectDecisionAncestry,
  diffDecisionAncestry,
  projectDecisionReviewCandidates,
  type DecisionTrailEvent,
} from "../decisionAncestry";

const scope = { userId: "owner", projectId: "project" };
const event = (
  id: string,
  kind: DecisionTrailEvent["kind"],
  overrides: Partial<DecisionTrailEvent> = {},
): DecisionTrailEvent => ({
  ...scope, id, decisionId: "select-runtime",
  occurredAt: `2026-10-07T12:00:0${id.length % 9}Z`,
  kind, summary: `synthetic ${kind}`, evidenceRefs: [],
  ...overrides,
});
const project = (events: DecisionTrailEvent[]) =>
  projectDecisionAncestry({ scope, decisionId: "select-runtime", events });

describe("bounded read-only Decision Ancestry projection", () => {
  it("preserves causal links and keeps externally reported outcomes unverified", () => {
    const proposal = event("a", "proposal", { evidenceRefs: ["source-ref"] });
    const choice = event("b", "choice", { supersedesEventId: "a" });
    const outcome = event("c", "observed_outcome", {
      evidenceRefs: ["host-outcome-ref"],
    });
    const result = project([outcome, choice, proposal]);
    expect(result.events.map(item => item.id)).toEqual(["a", "b", "c"]);
    expect(result.currentChoice?.id).toBe("b");
    expect(result.reportedOutcomeRefs).toEqual(["host-outcome-ref"]);
    expect(result.evidenceVerifiedHere).toBe(false);
    expect(result.grantsExecution).toBe(false);
    expect(result.grantsMemoryPromotion).toBe(false);
  });

  it("does not silently select one of two active choices", () => {
    const view = project([event("a", "choice"), event("b", "choice")]);
    expect(view.currentChoice).toBeNull();
    expect(view.warnings).toContain("parallel_choices");
  });

  it("does not resurrect a superseded choice or decide that a correction was fixed", () => {
    const view = project([
      event("a", "choice"),
      event("b", "correction", { supersedesEventId: "a" }),
      event("c", "correction"),
    ]);
    expect(view.currentChoice).toBeNull();
    expect(view.warnings).toContain("correction_requires_review");
    expect(view.warnings).toContain("repeated_corrections");
  });

  it("preserves missing predecessors instead of inventing a decision's history", () => {
    const view = project([event("a", "choice", { supersedesEventId: "older" })]);
    expect(view.missingPredecessors).toEqual(["older"]);
    expect(view.warnings).toContain("missing_predecessor");
  });

  it("flags outcome claims without source references", () => {
    const view = project([event("a", "observed_outcome")]);
    expect(view.reportedOutcomeRefs).toEqual([]);
    expect(view.warnings).toContain("unreferenced_outcome");
  });

  it("treats an exact retry as one event and conflicting reuse as an error", () => {
    const original = event("a", "choice");
    expect(project([original, { ...original }]).events).toHaveLength(1);
    expect(() => project([original, { ...original, summary: "different" }]))
      .toThrow("decision_ancestry_duplicate_conflict");
  });

  it("fails closed on foreign scope even when the event belongs to another decision", () => {
    const foreign = event("foreign", "choice", {
      userId: "different-owner",
      decisionId: "other-decision",
    });
    expect(() => project([event("a", "choice"), foreign]))
      .toThrow("decision_ancestry_scope_mismatch");
  });

  it("filters unrelated same-owner decisions without leaking them into this history", () => {
    const view = project([event("a", "choice"), event("b", "proposal", {
      decisionId: "other-decision", summary: "unrelated data",
    })]);
    expect(view.events.map(item => item.id)).toEqual(["a"]);
    expect(JSON.stringify(view)).not.toContain("unrelated data");
  });

  it("does not treat a later unlinked correction as proof a choice remains settled", () => {
    const view = project([
      event("a", "choice", { occurredAt: "2026-10-07T12:00:00Z" }),
      event("b", "correction", { occurredAt: "2026-10-07T12:10:00Z" }),
    ]);
    expect(view.currentChoice).toBeNull();
    expect(view.warnings).toContain("correction_requires_review");
  });

  it("rejects an event that falsely supersedes itself", () => {
    expect(() => project([event("a", "choice", {
      supersedesEventId: "a",
    })])).toThrow("decision_ancestry_invalid_event");
  });

  it("diffs source views without inventing missing work or authorizing changes", () => {
    const before = project([event("a", "choice")]);
    const after = project([event("a", "choice"), event("b", "correction", {
      supersedesEventId: "a",
    })]);
    const diff = diffDecisionAncestry(before, after);
    expect(diff.addedEventIds).toEqual(["b"]);
    expect(diff.missingPriorEventIds).toEqual([]);
    expect(diff.choiceChanged).toBe(true);
    expect(diff.requiresReview).toBe(true);
    expect(diff.grantsExecution).toBe(false);
  });

  it("flags disappearing history and refuses changed older evidence or foreign views", () => {
    const before = project([event("a", "choice")]);
    expect(diffDecisionAncestry(before, project([])).missingPriorEventIds)
      .toEqual(["a"]);
    expect(diffDecisionAncestry(before, project([])).requiresReview).toBe(true);
    expect(() => diffDecisionAncestry(
      before, project([event("a", "choice", { summary: "rewritten" })]),
    )).toThrow("decision_ancestry_history_conflict");
    const foreign = projectDecisionAncestry({
      scope: { userId: "other", projectId: "project" },
      decisionId: "select-runtime", events: [],
    });
    expect(() => diffDecisionAncestry(before, foreign))
      .toThrow("decision_ancestry_diff_scope_mismatch");
  });

  it("projects only review-worthy decision candidates with no automatic approval", () => {
    const clean = project([event("a", "choice")]);
    const flagged = projectDecisionAncestry({
      scope, decisionId: "another-decision",
      events: [
        event("a", "choice", { decisionId: "another-decision" }),
        event("b", "choice", { decisionId: "another-decision" }),
      ],
    });
    const item = projectDecisionReviewCandidates({
      scope, views: [clean, flagged],
    });
    expect(item.items).toHaveLength(1);
    expect(item.items[0].decisionId).toBe("another-decision");
    expect(item.items[0].reasons).toContain("parallel_choices");
    expect(item.grantsExecution).toBe(false);
    expect(item.requiresHumanApprovalDetermination).toBe(true);
  });

  it("fails closed on cross-owner review candidates and repeated decision keys", () => {
    const one = project([event("a", "correction")]);
    const foreign = projectDecisionAncestry({
      scope: { userId: "intruder", projectId: "project" },
      decisionId: "select-runtime",
      events: [event("b", "correction", { userId: "intruder" })],
    });
    expect(() => projectDecisionReviewCandidates({
      scope, views: [one, foreign],
    })).toThrow("decision_review_scope_mismatch");
    expect(() => projectDecisionReviewCandidates({
      scope, views: [one, one],
    })).toThrow("decision_review_duplicate_or_invalid");
  });

  it("keeps the candidate view bounded and honestly reports truncation", () => {
    const makeView = (decisionId: string) => projectDecisionAncestry({
      scope, decisionId,
      events: [event("a", "correction", { decisionId })],
    });
    const one = makeView("one");
    const two = makeView("two");
    const result = projectDecisionReviewCandidates({
      scope, views: [two, one], limit: 1,
    });
    expect(result.items.map(item => item.decisionId)).toEqual(["one"]);
    expect(result.truncated).toBe(true);
    expect(() => projectDecisionReviewCandidates({
      scope, views: [one], limit: 0,
    })).toThrow("decision_review_invalid_input");
  });

  it("rejects forged clean or inconsistent views instead of suppressing review signals", () => {
    const flagged = project([event("a", "correction")]);
    expect(() => projectDecisionReviewCandidates({
      scope, views: [{ ...flagged, warnings: [] }],
    })).toThrow("decision_ancestry_view_invalid");
    expect(() => projectDecisionReviewCandidates({
      scope, views: [{ ...flagged, decisionId: "rewritten-id" }],
    })).toThrow("decision_ancestry_view_invalid");
  });

  it("requires bounded, plausible records and refuses oversized unreconciled histories", () => {
    expect(() => project([event("a", "choice", { occurredAt: "invalid-time" })]))
      .toThrow("decision_ancestry_invalid_event");
    const tooMany = Array.from({ length: 129 }, (_, i) =>
      event(`e-${i}`, "proposal"));
    expect(() => project(tooMany)).toThrow("decision_ancestry_invalid_input");
  });
});


describe("complete history reference validation", () => {
  it.each([
    { refs: new Array<string>(1) },
    { refs: Object.assign(new Array<string>(2), { 0: "source" }) },
  ])("rejects sparse outcome evidence instead of accepting missing refs", ({ refs }) => {
    expect(() => project([event("outcome", "observed_outcome", { evidenceRefs: refs })]))
      .toThrow("decision_ancestry_invalid_event");
  });
});

import { describe, expect, it } from "vitest";
import {
  projectDecisionAncestry,
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

  it("requires bounded, plausible records and refuses oversized unreconciled histories", () => {
    expect(() => project([event("a", "choice", { occurredAt: "invalid-time" })]))
      .toThrow("decision_ancestry_invalid_event");
    const tooMany = Array.from({ length: 129 }, (_, i) =>
      event(`e-${i}`, "proposal"));
    expect(() => project(tooMany)).toThrow("decision_ancestry_invalid_input");
  });
});

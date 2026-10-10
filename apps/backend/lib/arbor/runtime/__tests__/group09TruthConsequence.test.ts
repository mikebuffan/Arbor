import { describe, expect, it } from "vitest";
import { routeFireflyPacket, type FireflyRoundaboutInput } from "../knowledgeRouting";
import { projectDecisionAncestry, type DecisionTrailEvent } from "../decisionAncestry";

const scope = {
  userId: "fixture-owner", projectId: "fixture-project",
  conversationId: "fixture-conversation", turnId: "fixture-turn",
};
const packet = {
  packetType: "observation", meaning: "Synthetic disputed evidence",
  confidence: 0.8, relevance: 0.8,
  provenance: [{ sourceKind: "synthetic", sourceRef: "fixture-source" }],
};
const firefly = (changes: Partial<FireflyRoundaboutInput> = {}) =>
  routeFireflyPacket({
    scope, domain: "decision", packet, stage: "second_choice",
    rhythm: "stability", signal: "retrieval", ...changes,
  });
const event = (
  id: string, kind: DecisionTrailEvent["kind"],
  changes: Partial<DecisionTrailEvent> = {},
): DecisionTrailEvent => ({
  userId: scope.userId, projectId: scope.projectId,
  id, decisionId: "fixture-decision",
  occurredAt: "2026-10-07T12:00:00.000Z",
  kind, summary: "synthetic " + kind, evidenceRefs: [],
  ...changes,
});

describe("Group 09 source-bound truth and consequence HOLD", () => {
  it.each([
    { provenance: [{ sourceKind: "synthetic" }] },
    { provenance: [{ sourceKind: "synthetic", sourceRef: "   " }] },
    { provenance: [{ sourceKind: "synthetic", sourceRef: 42 }] },
    { provenance: [{ sourceKind: "synthetic", sourceRef: "x".repeat(501) }] },
    { provenance: new Array(1) },
    { provenance: [{ sourceKind: "synthetic", sourceRef: "fixture-source" }, ...new Array(1)] },
  ])("rejects provenance with no usable bounded source reference: %j", ({ provenance }) => {
    expect(() => firefly({ packet: { ...packet, confidence: 1, provenance } as any }))
      .toThrow("firefly_roundabout_packet_invalid");
  });

  it("cannot advance second choice without any reviewed consequence reference", () => {
    const view = firefly();
    expect(view.decision).toBe("hold");
    expect(view.reason).toBe("await_verified_consequence");
    expect(view.suggestedNextStage).toBe("second_choice");
    expect(view.learningApplied).toBe(false);
    expect(view.consequenceVerifiedByThisCode).toBe(false);
    expect(view.grantsExecution).toBe(false);
  });

  it("a bare outcome reference cannot advance a second choice or self-verify", () => {
    const view = firefly({ verifiedConsequenceRef: "claim:outcome-ref" });
    expect(view.reason).toBe("await_verified_consequence");
    expect(view.decision).toBe("hold");
    expect(view.suggestedNextStage).toBe("second_choice");
    expect(view.consequenceVerifiedByThisCode).toBe(false);
    expect(view.learningApplied).toBe(false);
    expect(view.grantsExecution).toBe(false);
  });

  const consequence = (changes: Record<string, unknown> = {}) => ({
    receiptId: "host:receipt:001",
    consequenceRef: "host:consequence:001",
    userId: scope.userId, projectId: scope.projectId,
    conversationId: scope.conversationId, turnId: scope.turnId,
    status: "confirmed", reviewedByHost: true,
    ...changes,
  });
  const receiptView = (changes: Record<string, unknown> = {}, signal: FireflyRoundaboutInput["signal"] = "retrieval") =>
    firefly({
      verifiedConsequenceRef: "host:consequence:001",
      consequenceReceipt: consequence(changes),
      signal,
    } as Partial<FireflyRoundaboutInput>);

  it("requires a matching scoped host-reviewed consequence receipt before advancing", () => {
    const view = receiptView();
    expect(view.reason).toBe("verified_consequence");
    expect(view.suggestedNextStage).toBe("consequence");
    expect(view.decision).not.toBe("hold");
    expect(view.consequenceVerifiedByThisCode).toBe(false);
    expect(view.learningApplied).toBe(false);
    expect(view.grantsExecution).toBe(false);
  });

  it.each([
    { status: "pending" },
    { status: "rejected" },
    { reviewedByHost: false },
  ])("holds an outcome that the host has not confirmed: %j", (change) => {
    const view = receiptView(change);
    expect(view.decision).toBe("hold");
    expect(view.reason).toBe("await_verified_consequence");
    expect(view.suggestedNextStage).toBe("second_choice");
    expect(view.grantsExecution).toBe(false);
  });

  it.each([
    { userId: "foreign-owner" },
    { projectId: "foreign-project" },
    { conversationId: "different-conversation" },
    { turnId: "replayed-turn" },
    { consequenceRef: "another-outcome" },
  ])("rejects a foreign or mismatched purported outcome record: %j", (change) => {
    expect(() => receiptView(change)).toThrow("firefly_roundabout_consequence_receipt_mismatch");
  });

  it("changes from apparent progress to re-observation when a reviewed negative consequence arrives", () => {
    const before = receiptView();
    const reconsider = receiptView({}, "prediction_error");
    expect(before.suggestedNextStage).toBe("consequence");
    expect(reconsider.decision).toBe("backtrack");
    expect(reconsider.suggestedNextStage).toBe("observe");
    expect(reconsider.reason).toBe("correction_backtrack");
    expect(reconsider.grantsExecution).toBe(false);
    expect(reconsider.learningApplied).toBe(false);
  });

  it("contradiction HOLD defeats a plausible choice and a claimed favorable outcome", () => {
    const view = firefly({
      packet: { ...packet, conflicts: ["synthetic contradiction"] },
      verifiedConsequenceRef: "claimed-outcome",
      signal: "active_objective",
    });
    expect(view.decision).toBe("hold");
    expect(view.reason).toBe("contradiction_hold");
    expect(view.requiresReview).toBe(true);
    expect(view.grantsExecution).toBe(false);
    expect(view.learningApplied).toBe(false);
  });

  it("rejects entirely missing provenance even with high claimed confidence", () => {
    expect(() => firefly({ packet: { ...packet, confidence: 1, provenance: [] } }))
      .toThrow("firefly_roundabout_packet_invalid");
  });

  it("a return is not permission to auto-resume a previously blocked choice", () => {
    const view = firefly({ rhythm: "return", signal: "retrieval" });
    expect(view.decision).toBe("backtrack");
    expect(view.suggestedNextStage).toBe("observe");
    expect(view.learningApplied).toBe(false);
  });

  it("decision history doesn't promote unsourced outcomes or competing choices", () => {
    const projected = projectDecisionAncestry({
      scope: { userId: scope.userId, projectId: scope.projectId },
      decisionId: "fixture-decision",
      events: [event("a", "choice"), event("b", "choice"),
        event("c", "observed_outcome")],
    });
    expect(projected.currentChoice).toBeNull();
    expect(projected.warnings).toContain("parallel_choices");
    expect(projected.warnings).toContain("unreferenced_outcome");
    expect(projected.evidenceVerifiedHere).toBe(false);
    expect(projected.grantsExecution).toBe(false);
    expect(projected.grantsMemoryPromotion).toBe(false);
  });

  it("counterevidence holds a previously selected choice for re-review", () => {
    const projected = projectDecisionAncestry({
      scope: { userId: scope.userId, projectId: scope.projectId },
      decisionId: "fixture-decision",
      events: [event("a", "choice"),
        event("b", "correction", { occurredAt: "2026-10-07T13:00:00.000Z" })],
    });
    expect(projected.currentChoice).toBeNull();
    expect(projected.warnings).toContain("correction_requires_review");
    expect(projected.grantsExecution).toBe(false);
  });

  it("foreign-owner evidence fails closed before any decision review", () => {
    expect(() => projectDecisionAncestry({
      scope: { userId: scope.userId, projectId: scope.projectId },
      decisionId: "fixture-decision",
      events: [event("x", "choice", { userId: "foreign-owner" })],
    })).toThrow("decision_ancestry_scope_mismatch");
  });
});

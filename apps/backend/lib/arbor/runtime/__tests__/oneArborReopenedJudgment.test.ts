import { describe, expect, it } from "vitest";
import {
  routeFireflyPacket,
  type FireflyRoundaboutInput,
} from "../knowledgeRouting";
import {
  projectDecisionAncestry,
  type DecisionTrailEvent,
} from "../decisionAncestry";

const scope = {
  userId: "fixture-owner",
  projectId: "fixture-project",
  conversationId: "fixture-conversation",
  turnId: "fixture-turn",
};
const decisionId = "fixture-decision";
const packet = {
  packetType: "observation",
  meaning: "Review the actual synthetic outcome before choosing again.",
  provenance: [{sourceKind:"synthetic",sourceRef:"fixture-trace"}],
  relevance: 0.8,
};

function firefly(
  choiceId: string,
  signal: FireflyRoundaboutInput["signal"],
  opts: { receiptChoice?: string; conflict?: boolean; noReceipt?: boolean } = {},
) {
  const verifiedConsequenceRef = opts.noReceipt ? null : "host:outcome:original";
  return routeFireflyPacket({
    scope, domain: "decision", packet: {
      ...packet,
      ...(opts.conflict ? {conflicts:["fixture:contradiction"]} : {}),
    },
    rhythm:"stability", stage:"second_choice", signal,
    decisionId, choiceId, verifiedConsequenceRef,
    ...(opts.noReceipt ? {} : {consequenceReceipt:{
      receiptId:"host:readback:original",
      consequenceRef:"host:outcome:original",
      decisionId, choiceId:opts.receiptChoice ?? choiceId,
      ...scope,
      status:"confirmed" as const,
      reviewedByHost:true,
    }}),
  });
}

function event(
  id: string,
  kind: DecisionTrailEvent["kind"],
  occurredAt: string,
  changes: Partial<DecisionTrailEvent> = {},
): DecisionTrailEvent {
  return {
    userId:scope.userId, projectId:scope.projectId,
    decisionId, id, occurredAt, kind, summary:`synthetic ${kind}`,
    evidenceRefs:[],
    ...changes,
  };
}
const proposed=event("proposal","proposal","2026-10-10T08:00:00.000Z");
const first=event("choice-a","choice","2026-10-10T08:01:00.000Z");
const outcome=event("outcome-a","observed_outcome","2026-10-10T08:02:00.000Z",{
  evidenceRefs:["host:outcome:original"],
});
const correction=event("correction-a","correction","2026-10-10T08:03:00.000Z",{
  supersedesEventId:"choice-a",
  evidenceRefs:["host:outcome:original"],
});
const revised=event("choice-b","choice","2026-10-10T08:04:00.000Z",{
  evidenceRefs:["review:reconsidered"],
});
const project=(events: readonly DecisionTrailEvent[])=>projectDecisionAncestry({
  scope:{userId:scope.userId,projectId:scope.projectId},
  decisionId,events,
});

describe("One Arbor reopened D09/B15/D11 combined source evaluation",()=>{
  it("transitions from first choice through its consequence to a distinct revised choice",()=>{
    const before=project([proposed,first]);
    expect(before.currentChoice?.id).toBe("choice-a");

    const originalResult=firefly("choice-a","retrieval");
    expect(originalResult.suggestedNextStage).toBe("consequence");
    expect(originalResult.grantsExecution).toBe(false);

    const updated=project([proposed,first,outcome,correction,revised]);
    expect(updated.currentChoice?.id).toBe("choice-b");
    expect(updated.currentChoice?.id).not.toBe(before.currentChoice?.id);
    expect(updated.reportedOutcomeRefs).toContain("host:outcome:original");
    expect(updated.warnings).toContain("correction_requires_review");
    expect(updated.evidenceVerifiedHere).toBe(false);
    expect(updated.grantsExecution).toBe(false);

    // Negative observed consequence makes the next step re-observation,
    // not a declaration that the new choice or the prior one is approved.
    const reconsider=firefly("choice-a","prediction_error");
    expect(reconsider.decision).toBe("backtrack");
    expect(reconsider.suggestedNextStage).toBe("observe");
    expect(reconsider.learningApplied).toBe(false);

    // A previous action receipt must not be silently reused for choice B.
    expect(()=>firefly("choice-b","retrieval",{receiptChoice:"choice-a"}))
      .toThrow("firefly_roundabout_consequence_receipt_mismatch");
    const pending=firefly("choice-b","retrieval",{noReceipt:true});
    expect(pending.decision).toBe("hold");
    expect(pending.suggestedNextStage).toBe("second_choice");
    expect(pending.grantsExecution).toBe(false);
  });

  it("contradiction still holds despite a favorable reviewed receipt and strong claim",()=>{
    const result=firefly("choice-a","active_objective",{conflict:true});
    expect(result.decision).toBe("hold");
    expect(result.reason).toBe("contradiction_hold");
    expect(result.requiresReview).toBe(true);
    expect(result.grantsExecution).toBe(false);
    expect(result.learningApplied).toBe(false);
    expect(result.consequenceVerifiedByThisCode).toBe(false);
  });

  it("rejects cross-project decision-history injection before it can change a choice",()=>{
    expect(()=>project([proposed,first,{
      ...revised,projectId:"other-project",
    }])).toThrow("decision_ancestry_scope_mismatch");
  });
});

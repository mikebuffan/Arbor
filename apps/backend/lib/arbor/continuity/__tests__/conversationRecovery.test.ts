import { describe, expect, it } from "vitest";
import type { AgencyState } from "../../agency/engine";
import {
  projectConversationRecovery,
  type RecoveryObservation,
} from "../conversationRecovery";

const scope = { userId: "owner", projectId: "project", conversationId: "thread" };
const goal = (status: AgencyState["status"] = "active"): AgencyState => ({
  goal: "finish source acceptance",
  status, currentStep: 4, unresolvedWork: ["next safe regression"],
  recurringWeaknesses: [], strategyNotes: [],
  blocker: status === "blocked" ? "external_authority" : null,
});
const item = (
  id: string, kind: RecoveryObservation["kind"],
  overrides: Partial<RecoveryObservation> = {},
): RecoveryObservation => ({
  ...scope, id, kind,
  observedAt: "2026-10-07T12:00:00Z",
  evidenceRefs: ["host:" + id],
  ...overrides,
});
const view = (
  observations: RecoveryObservation[], agency: AgencyState | null = goal(),
) => projectConversationRecovery({ scope, agency, observations });

describe("host-observed Known / Unknown / Next recovery", () => {
  it("continues only the existing unfinished goal without manufacturing work", () => {
    const result = view([]);
    expect(result.known).toMatchObject({
      goal: "finish source acceptance", nextUnresolvedAction: "next safe regression",
      status: "active",
    });
    expect(result.next).toBe("continue_existing_goal");
    expect(result.observationVerifiedHere).toBe(false);
    expect(result.grantsExecution).toBe(false);
    expect(result.changesAgencyState).toBe(false);
    expect(result.changesIdentity).toBe(false);
  });

  it("requires two independently identified observed repeated failures before loop review", () => {
    expect(view([item("one", "repeated_unhelpful_reply")]).next)
      .toBe("continue_existing_goal");
    const multiple = view([
      item("one", "repeated_unhelpful_reply"),
      item("two", "repeated_unhelpful_reply"),
    ]);
    expect(multiple.unknown).toContain("reply_loop_needs_recheck");
    expect(multiple.next).toBe("recheck_context");
    expect(multiple.observedIssueIds).toEqual(["one", "two"]);
  });

  it("does not treat multiple copies of the same evidence as independent failure", () => {
    const copy = item("a", "repeated_unhelpful_reply", {
      evidenceRefs: ["host:same"],
    });
    expect(view([copy, { ...copy }]).next).toBe("continue_existing_goal");
    expect(view([copy, item("b", "repeated_unhelpful_reply", {
      evidenceRefs: ["host:same"],
    })]).next).toBe("continue_existing_goal");
  });

  it("lets verified stability close earlier diagnostics without erasing original events", () => {
    const result = view([
      item("a", "repeated_unhelpful_reply", { observedAt: "2026-10-07T11:00:00Z" }),
      item("b", "repeated_unhelpful_reply", { observedAt: "2026-10-07T11:01:00Z" }),
      item("stable", "stable_verified_continuation", { observedAt: "2026-10-07T12:00:00Z" }),
    ]);
    expect(result.next).toBe("continue_existing_goal");
    expect(result.observedIssueIds).toEqual([]);
    expect(result.unknown).not.toContain("reply_loop_needs_recheck");
  });

  it("reopens correction review after a previously stable turn", () => {
    expect(view([
      item("stable", "stable_verified_continuation", { observedAt: "2026-10-07T10:00:00Z" }),
      item("correction", "correction_not_applied", { observedAt: "2026-10-07T13:00:00Z" }),
    ]).next).toBe("review_correction");
  });

  it("holds contradictory completion without closing the objective", () => {
    const prior = goal("checkpointed");
    const result = view([item("conflict", "contradictory_completion_claim")], prior);
    expect(result.next).toBe("hold_for_verification");
    expect(result.unknown).toContain("completion_requires_proof");
    expect(prior.status).toBe("checkpointed");
  });

  it("preserves a protected blocker even after apparent recovery", () => {
    const prior = goal("blocked");
    const result = view([item("stable", "stable_verified_continuation")], prior);
    expect(result.next).toBe("respect_blocker");
    expect(result.known.blocker).toBe("external_authority");
    expect(prior.blocker).toBe("external_authority");
  });

  it("does not resurrect work already complete or replace an absent goal with a guess", () => {
    expect(view([], goal("complete")).next).toBe("no_unfinished_goal");
    const empty = view([], null);
    expect(empty.next).toBe("ask_for_missing_goal");
    expect(empty.unknown).toContain("missing_durable_goal");
    expect(empty.known.goal).toBeNull();
  });

  it("denies cross-owner and cross-conversation observations", () => {
    expect(() => view([item("bad", "context_mismatch", { userId: "other" })]))
      .toThrow("conversation_recovery_scope_mismatch");
    expect(() => view([item("bad", "context_mismatch", { conversationId: "other" })]))
      .toThrow("conversation_recovery_scope_mismatch");
  });

  it("rejects missing source receipts, forged signal vocabulary and duplicate IDs with different evidence", () => {
    expect(() => view([item("bad", "context_mismatch", { evidenceRefs: [] })]))
      .toThrow("conversation_recovery_invalid_observation");
    expect(() => view([item("bad", "nonexistent" as RecoveryObservation["kind"])]))
      .toThrow("conversation_recovery_invalid_observation");
    expect(() => view([
      item("same", "context_mismatch"),
      item("same", "correction_not_applied"),
    ])).toThrow("conversation_recovery_event_conflict");
  });

  it("bounds the projected observation window and rejects empty scope", () => {
    expect(() => view(Array.from({ length: 41 }, (_, i) =>
      item(String(i), "context_mismatch")))).toThrow("conversation_recovery_invalid_input");
    expect(() => projectConversationRecovery({
      scope: { ...scope, projectId: "" }, agency: goal(), observations: [],
    })).toThrow("conversation_recovery_scope_required");
  });
});

import { describe, expect, it } from "vitest";
import type { AgencyState } from "../../agency/engine";
import type { RecoveryObservation } from "../../continuity/conversationRecovery";
import {
  switchHostSurface,
  type OneArborHostState,
} from "../oneArborHostBridge";
import { projectHostRecoveryRead } from "../recoveryReadProjection";

const scope = {
  userId: "owner",
  projectId: "private-project",
  conversationId: "conversation-1",
};
const host = (overrides: Partial<OneArborHostState> = {}): OneArborHostState => ({
  schemaVersion: 1,
  sessionId: "session-1",
  projectId: scope.projectId,
  conversationId: scope.conversationId,
  surface: "text",
  authority: "arbor",
  currentGoal: "Finish the existing safe review",
  lastMeaningfulUserTurn: "continue",
  lastMeaningfulArborTurn: "working on review",
  unresolvedWork: [{
    id: "review",
    title: "Read source evidence",
    status: "active",
    nextAction: null,
  }],
  corrections: [],
  behaviorProof: null,
  updatedAt: "2026-10-07T12:00:00Z",
  ...overrides,
});
const agency = (overrides: Partial<AgencyState> = {}): AgencyState => ({
  goal: "Finish the existing safe review",
  status: "active",
  currentStep: 4,
  unresolvedWork: ["Read source evidence"],
  recurringWeaknesses: [],
  strategyNotes: [],
  blocker: null,
  ...overrides,
});
const event = (
  id: string,
  kind: RecoveryObservation["kind"],
): RecoveryObservation => ({
  ...scope, id, kind, evidenceRefs: ["host-reviewed:" + id],
  observedAt: "2026-10-07T12:00:00Z",
});
const project = (params: {
  host?: OneArborHostState;
  agency?: AgencyState | null;
  observations?: RecoveryObservation[];
} = {}) => projectHostRecoveryRead({
  scope,
  host: params.host ?? host(),
  agency: params.agency === undefined ? agency() : params.agency,
  observations: params.observations ?? [],
});

describe("One Arbor host reads recovery without inventing authority", () => {
  it("reuses durable agency goal and current host projection, without changing state", () => {
    const state = agency();
    const hostState = host();
    const before = JSON.stringify([state, hostState]);
    const result = project({ agency: state, host: hostState });
    expect(result.hostGoalStatus).toBe("matched");
    expect(result.next).toBe("continue_existing_goal");
    expect(result.recovery.known.nextUnresolvedAction).toBe("Read source evidence");
    expect(result.authenticatedHere).toBe(false);
    expect(result.observationsVerifiedHere).toBe(false);
    expect(result.grantsExecution).toBe(false);
    expect(result.grantsMemoryPromotion).toBe(false);
    expect(JSON.stringify([state, hostState])).toBe(before);
  });

  it("holds a contradictory host goal instead of inventing temporal precedence", () => {
    const result = project({ host: host({ currentGoal: "Old unrelated objective" }) });
    expect(result.hostGoalStatus).toBe("diverged");
    expect(result.next).toBe("reconcile_host_goal");
    expect(result.recovery.known.goal).toBe("Finish the existing safe review");
  });

  it("never clears a durable protected blocker even during conflicting host state", () => {
    const result = project({
      agency: agency({ status: "blocked", blocker: "external_authority" }),
      host: host({ currentGoal: "Other action" }),
    });
    expect(result.hostGoalStatus).toBe("diverged");
    expect(result.next).toBe("respect_blocker");
    expect(result.recovery.known.blocker).toBe("external_authority");
  });

  it("does not turn a host-only narrative into a missing durable agency goal", () => {
    const result = project({ agency: null });
    expect(result.hostGoalStatus).toBe("not_comparable");
    expect(result.next).toBe("ask_for_missing_goal");
    expect(result.recovery.known.goal).toBeNull();
    expect(result.recovery.unknown).toContain("missing_durable_goal");
  });

  it("does not resurrect completed work when host still mentions it", () => {
    const result = project({ agency: agency({
      status: "complete", unresolvedWork: [],
    }) });
    expect(result.next).toBe("no_unfinished_goal");
    expect(result.grantsExecution).toBe(false);
  });

  it("holds two observed repeat failures while preserving original goal", () => {
    const result = project({
      observations: [
        event("first", "repeated_unhelpful_reply"),
        event("second", "repeated_unhelpful_reply"),
      ],
    });
    expect(result.next).toBe("recheck_context");
    expect(result.recovery.unknown).toContain("reply_loop_needs_recheck");
    expect(result.recovery.known.goal).toBe("Finish the existing safe review");
  });

  it("changing presentation to voice does not change goal or authorization", () => {
    const h = switchHostSurface(host(), "voice", "2026-10-07T12:01:00Z");
    const result = project({ host: h });
    expect(result.hostSurface).toBe("voice");
    expect(result.next).toBe("continue_existing_goal");
    expect(result.authenticatedHere).toBe(false);
    expect(result.grantsExecution).toBe(false);
  });

  it("rejects foreign project, foreign conversation and invalid host revision", () => {
    expect(() => project({ host: host({ projectId: "foreign-project" }) }))
      .toThrow("host_recovery_host_scope_mismatch");
    expect(() => project({ host: host({ conversationId: "other-conversation" }) }))
      .toThrow("host_recovery_host_scope_mismatch");
    expect(() => project({ host: host({ schemaVersion: 2 as 1 }) }))
      .toThrow("host_recovery_host_scope_mismatch");
  });

  it("denies foreign observed events even if host and agency otherwise match", () => {
    expect(() => project({ observations: [{
      ...event("foreign", "context_mismatch"), userId: "other-owner",
    }] })).toThrow("conversation_recovery_scope_mismatch");
  });

  it("never confuses Annabelle authority with a second durable identity", () => {
    const result = project({ host: host({ authority: "annabelle" }) });
    expect(result.hostAuthority).toBe("annabelle");
    expect(result.recovery.known.goal).toBe("Finish the existing safe review");
    expect(result.grantsMemoryPromotion).toBe(false);
  });
});

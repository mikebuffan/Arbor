import { describe, expect, it } from "vitest";
import {
  reconcileWorkOrder,
  type IncomingWorkOrder,
  type ScopedWork,
  type WorkStatus,
} from "../workOrderBoundary";

const scope = { authenticatedOwnerId: "owner-a", selectedProjectId: "project-ark" };
const active: ScopedWork = {
  ownerId: "owner-a",
  projectId: "project-ark",
  objectiveId: "objective-a",
  assignedThreadId: "thread-a",
  status: "running",
};
const incoming: IncomingWorkOrder = {
  kind: "user_instruction",
  ownerId: "owner-a",
  projectId: "project-ark",
  threadId: "thread-a",
  objectiveId: "objective-a",
  intent: "continue",
  explicitTakeover: false,
};
const decide = (
  change: Partial<IncomingWorkOrder> = {},
  current: ScopedWork | null = active,
) => reconcileWorkOrder({
  ...scope,
  active: current,
  incoming: { ...incoming, ...change },
});

describe("ARK x Arbor Layer work-order boundary", () => {
  it("treats pasted status with imperative-looking text as data, not assignment", () => {
    const decision = decide({
      kind: "status_report",
      threadId: "thread-b",
      objectiveId: "objective-new",
      intent: "take_over",
      explicitTakeover: true,
    });
    expect(decision).toEqual({
      disposition: "status_only",
      requiresReconciliation: false,
      grantsExecution: false,
    });
  });

  it("continues the assigned objective in its current thread", () => {
    expect(decide().disposition).toBe("resume_same_thread");
    expect(decide({ intent: "inspect" }).disposition).toBe("no_takeover_instruction");
  });

  it("does not convert a second thread's resume request to a lease takeover", () => {
    const decision = decide({ threadId: "thread-b" });
    expect(decision.disposition).toBe("concurrent_thread_conflict");
    expect(decision.requiresReconciliation).toBe(true);
    expect(decision.grantsExecution).toBe(false);
  });

  it("permits an explicit same-objective checkpoint handoff, not a running takeover", () => {
    expect(decide(
      { threadId: "thread-b", intent: "take_over", explicitTakeover: true },
      { ...active, status: "checkpointed" },
    ).disposition).toBe("handoff_checkpointed");
    for (const status of ["running", "queued"] as WorkStatus[]) {
      expect(decide(
        { threadId: "thread-b", intent: "take_over", explicitTakeover: true },
        { ...active, status },
      ).disposition).toBe("concurrent_thread_conflict");
    }
    for (const [status, disposition] of [
      ["blocked", "blocked_objective_requires_resolution"],
      ["failed", "failed_objective_requires_recovery"],
      ["awaiting_verification", "verification_pending"],
    ] as const) {
      expect(decide(
        { threadId: "thread-b", intent: "take_over", explicitTakeover: true },
        { ...active, status },
      )).toMatchObject({ disposition, requiresReconciliation: true, grantsExecution: false });
      expect(decide({}, { ...active, status }).disposition).toBe(disposition);
    }
    expect(decide({
      threadId: "thread-b",
      intent: "take_over",
      explicitTakeover: false,
    }, { ...active, status: "checkpointed" }).disposition)
      .toBe("concurrent_thread_conflict");
  });

  it("does not silently replace one active objective with another", () => {
    expect(decide({ objectiveId: "other" }).disposition).toBe("objective_conflict");
    expect(decide({ objectiveId: "other", intent: "take_over", explicitTakeover: true })
      .disposition).toBe("objective_conflict");
    expect(decide({ intent: "start_new" }).disposition).toBe("objective_conflict");
  });

  it("requires verified owner/project scope on BOTH active and new work", () => {
    expect(decide({ ownerId: "owner-b" }).disposition).toBe("scope_mismatch");
    expect(decide({ projectId: "other" }).disposition).toBe("scope_mismatch");
    expect(decide({}, { ...active, ownerId: "owner-b" }).disposition)
      .toBe("scope_mismatch");
    expect(decide({}, { ...active, projectId: "other" }).disposition)
      .toBe("scope_mismatch");
    expect(reconcileWorkOrder({
      authenticatedOwnerId: "",
      selectedProjectId: scope.selectedProjectId,
      active: null,
      incoming,
    }).disposition).toBe("scope_mismatch");
  });

  it("distinguishes unassigned, completed, cancelled and absent objectives", () => {
    expect(decide({}, { ...active, assignedThreadId: null, status: "queued" }).disposition)
      .toBe("resume_unassigned");
    expect(decide({}, { ...active, assignedThreadId: null, status: "running" }).disposition)
      .toBe("concurrent_thread_conflict");
    expect(decide({}, { ...active, assignedThreadId: null, status: "awaiting_verification" }).disposition)
      .toBe("verification_pending");
    expect(decide({ objectiveId: "other" }, { ...active, status: "completed" })
      .disposition).toBe("prior_objective_terminal");
    expect(decide({ objectiveId: "other" }, { ...active, status: "cancelled" })
      .disposition).toBe("prior_objective_terminal");
    expect(decide({}, null).disposition).toBe("no_active_objective");
  });

  it("never produces an execution authorization", () => {
    const results = [
      decide(), decide({ kind: "status_report" }), decide({ ownerId: "wrong" }),
      decide({ objectiveId: "different" }), decide({}, null),
    ];
    expect(results.every((item) => item.grantsExecution === false)).toBe(true);
  });
});

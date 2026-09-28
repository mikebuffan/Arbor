import { describe, expect, it, vi } from "vitest";
import type { ResearchSession, ResearchUnitReceipt } from "./sessionPolicy";
import type { ResearchClaim } from "./sessionRunner";
import {
  MAX_CONTROLLER_APPEND_PER_PULSE,
  runResearchControllerPulse,
  type PlannedResearchUnit,
  type ResearchControllerContext,
  type ResearchControllerStore,
} from "./researchController";
import type { TrustedResearchHandoff } from "./arkResearchHandoff";

const AT = "2026-09-28T20:00:00.000Z";

function session(overrides: Partial<ResearchSession> = {}): ResearchSession {
  return {
    id: "research-session",
    userId: "owner-A",
    projectId: "project-A",
    objective: "Investigate the bounded public-record question and follow useful evidence.",
    status: "queued",
    startedAt: "2026-09-28T19:30:00.000Z",
    deadlineAt: "2026-09-28T20:30:00.000Z",
    maxWorkUnits: 20,
    consumedWorkUnits: 0,
    maxCostCents: 100,
    committedCostCents: 0,
    authorized: true,
    cancellationRequested: false,
    unresolvedRequiredWork: 3,
    completedEvidenceRefs: [],
    ...overrides,
  };
}

const handoff: TrustedResearchHandoff = {
  ownerId: "owner-A",
  projectId: "project-A",
  sessionId: "research-session",
  objectiveId: "ark-objective",
  authorizationVersion: "1",
  sourceAccessApproved: true,
  privacyReviewRequired: true,
};

const claim: ResearchClaim = {
  unitId: "unit-1",
  leaseToken: "lease-1",
  idempotencyKey: "unit-key-1",
  kind: "synthetic_evidence",
  payload: { source: "synthetic-only" },
  maxCostReservationCents: 2,
};

function receipt(s: ResearchSession): ResearchUnitReceipt {
  return {
    sessionId: s.id,
    unitId: claim.unitId,
    idempotencyKey: claim.idempotencyKey,
    status: "completed",
    recordedAt: AT,
    costCents: 1,
    evidenceRefs: ["synthetic:evidence:1"],
    unresolvedRequiredWork: Math.max(0, s.unresolvedRequiredWork - 1),
  };
}

function fixture(input?: {
  session?: ResearchSession;
  context?: Partial<ResearchControllerContext>;
  claim?: ResearchClaim | null;
  settle?: "committed" | "duplicate" | "lease_lost";
}) {
  const s = input?.session ?? session();
  const context: ResearchControllerContext = {
    session: s,
    units: [{
      unitKey: claim.idempotencyKey,
      kind: claim.kind,
      status: "queued",
      attemptCount: 0,
      maxAttempts: 3,
    }],
    recentReceipts: [],
    ...input?.context,
  };

  const store: ResearchControllerStore = {
    loadControllerContext: vi.fn(async () => context),
    appendPlannedUnits: vi.fn(async ({ units }) => ({
      appended: units.length,
      existing: 0,
    })),
    loadSession: vi.fn(async () => s),
    claimOne: vi.fn(async () => input?.claim === undefined ? claim : input.claim),
    settle: vi.fn(async () => input?.settle ?? "committed"),
    stop: vi.fn(async () => {}),
  };

  const executor = vi.fn(async () => receipt(s));
  return { s, context, store, executor };
}

describe("research controller pulse", () => {
  it("lets Arbor choose the next existing unit, commits one trusted tick, then yields checkpointed", async () => {
    const f = fixture();
    const planner = {
      plan: vi.fn(async () => ({
        action: "run_next" as const,
        rationale: "The existing queued unit is the next useful bounded step.",
      })),
    };

    const result = await runResearchControllerPulse({
      handoff,
      store: f.store,
      executor: f.executor,
      planner,
      at: AT,
    });

    expect(planner.plan).toHaveBeenCalledOnce();
    expect(f.store.appendPlannedUnits).not.toHaveBeenCalled();
    expect(f.store.claimOne).toHaveBeenCalledOnce();
    expect(f.store.settle).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      status: "checkpointed",
      plan: "run_next",
      appendedUnits: 0,
      checkpoint: {
        kind: "research_checkpoint",
        sessionId: "research-session",
        objectiveId: "ark-objective",
        evidenceRefs: ["synthetic:evidence:1"],
        completionVerified: false,
      },
    });
  });

  it("lets Arbor expand the durable task graph before executing one bounded tick", async () => {
    const f = fixture({
      context: { units: [] },
    });
    const unit: PlannedResearchUnit = {
      unitKey: "follow-contradiction-1",
      kind: "synthetic_evidence",
      description: "Follow one synthetic contradiction without widening authority.",
      payload: { lead: "synthetic-only" },
      maxCostReservationCents: 2,
      maxAttempts: 3,
    };
    const planner = {
      plan: vi.fn(async () => ({
        action: "append_then_run" as const,
        rationale: "The current evidence creates one bounded follow-up.",
        units: [unit],
      })),
    };

    const result = await runResearchControllerPulse({
      handoff,
      store: f.store,
      executor: f.executor,
      planner,
      at: AT,
    });

    expect(f.store.appendPlannedUnits).toHaveBeenCalledWith({
      session: f.s,
      units: [unit],
    });
    expect(result).toMatchObject({
      status: "checkpointed",
      plan: "append_then_run",
      appendedUnits: 1,
    });
  });

  it("stops on cancellation before Arbor can plan or execute more work", async () => {
    const f = fixture({
      session: session({ cancellationRequested: true }),
    });
    const planner = { plan: vi.fn() };

    const result = await runResearchControllerPulse({
      handoff,
      store: f.store,
      executor: f.executor,
      planner,
      at: AT,
    });

    expect(result).toEqual({ status: "stopped", reason: "cancelled_by_owner" });
    expect(f.store.stop).toHaveBeenCalledOnce();
    expect(planner.plan).not.toHaveBeenCalled();
    expect(f.store.claimOne).not.toHaveBeenCalled();
  });

  it("stops on the authorized deadline before planner or executor activity", async () => {
    const f = fixture({
      session: session({
        startedAt: "2026-09-28T18:00:00.000Z",
        deadlineAt: "2026-09-28T19:00:00.000Z",
      }),
    });
    const planner = { plan: vi.fn() };

    const result = await runResearchControllerPulse({
      handoff,
      store: f.store,
      executor: f.executor,
      planner,
      at: AT,
    });

    expect(result).toEqual({ status: "stopped", reason: "session_deadline_reached" });
    expect(planner.plan).not.toHaveBeenCalled();
    expect(f.store.claimOne).not.toHaveBeenCalled();
  });

  it("can yield for human review without pretending research is complete", async () => {
    const f = fixture({
      session: session({ unresolvedRequiredWork: 0 }),
      context: { units: [] },
    });
    const planner = {
      plan: vi.fn(async () => ({
        action: "await_review" as const,
        rationale: "The queue is exhausted; independent source/privacy review is still required.",
        unresolvedWork: ["independent source/privacy review"],
      })),
    };

    const result = await runResearchControllerPulse({
      handoff,
      store: f.store,
      executor: f.executor,
      planner,
      at: AT,
    });

    expect(result).toEqual({
      status: "awaiting_review",
      reason: "The queue is exhausted; independent source/privacy review is still required.",
      unresolvedWork: ["independent source/privacy review"],
    });
    expect(f.store.claimOne).not.toHaveBeenCalled();
  });

  it("rejects an unbounded planner expansion before persistence", async () => {
    const f = fixture({ context: { units: [] } });
    const planner = {
      plan: vi.fn(async () => ({
        action: "append_then_run" as const,
        rationale: "bad synthetic over-expansion",
        units: Array.from({ length: MAX_CONTROLLER_APPEND_PER_PULSE + 1 }, (_, i) => ({
          unitKey: "unit-" + i,
          kind: "synthetic_evidence",
          description: "Synthetic unit " + i,
          payload: {},
          maxCostReservationCents: 0,
        })),
      })),
    };

    await expect(runResearchControllerPulse({
      handoff,
      store: f.store,
      executor: f.executor,
      planner,
      at: AT,
    })).rejects.toThrow("research_controller_invalid_plan_size");

    expect(f.store.appendPlannedUnits).not.toHaveBeenCalled();
    expect(f.store.claimOne).not.toHaveBeenCalled();
  });

  it("rejects a controller context that crosses owner/project scope", async () => {
    const f = fixture({
      session: session({ projectId: "other-project" }),
    });
    const planner = { plan: vi.fn() };

    await expect(runResearchControllerPulse({
      handoff,
      store: f.store,
      executor: f.executor,
      planner,
      at: AT,
    })).rejects.toThrow("research_controller_scope_mismatch");

    expect(planner.plan).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import { ArkExecutorRegistry } from "../ark/executorRegistry";
import type { ArkClaim } from "../ark/types";
import type { ResearchSession } from "./sessionPolicy";
import type { ResearchClaim } from "./sessionRunner";
import type {
  ResearchControllerPlanner,
  ResearchControllerStore,
} from "./researchController";
import {
  ARK_RESEARCH_CONTROLLER_TASK_KIND,
  registerArkResearchControllerExecutor,
} from "./registerArkResearchControllerExecutor";

const AT = "2026-09-28T21:30:00.000Z";

function session(
  overrides: Partial<ResearchSession> = {},
): ResearchSession {
  return {
    id: "research-session",
    userId: "owner",
    projectId: "project",
    objective: "Synthetic Arbor reins research",
    status: "running",
    startedAt: "2026-09-28T20:00:00.000Z",
    deadlineAt: "2026-09-28T23:00:00.000Z",
    maxWorkUnits: 20,
    consumedWorkUnits: 2,
    maxCostCents: 100,
    committedCostCents: 2,
    authorized: true,
    cancellationRequested: false,
    unresolvedRequiredWork: 2,
    completedEvidenceRefs: [],
    ...overrides,
  };
}

function arkClaim(): ArkClaim {
  return {
    objective: {
      id: "ark-objective",
      userId: "owner",
      projectId: "project",
      goal: "Synthetic Arbor reins research",
      status: "running",
      priority: 0,
      budget: {
        maxTasksPerCycle: 1,
        maxRuntimeMs: 20_000,
        maxAttemptsPerTask: 12,
      },
      blocker: null,
      completionEvidence: null,
      version: 1,
      createdAt: AT,
      updatedAt: AT,
    },
    task: {
      id: "ark-controller-task",
      objectiveId: "ark-objective",
      userId: "owner",
      projectId: "project",
      taskKey: "controller",
      kind: ARK_RESEARCH_CONTROLLER_TASK_KIND,
      description: "Run one bounded Arbor research controller pulse",
      status: "running",
      dependencies: [],
      payload: { sessionId: "research-session" },
      result: null,
      attemptCount: 1,
      maxAttempts: 12,
      idempotencyKey: "ark-controller",
      availableAt: AT,
      leaseOwner: "ark-worker",
      leaseToken: "ark-lease",
      leaseExpiresAt: "2026-09-28T21:31:00.000Z",
      heartbeatAt: AT,
      checkpointSequence: 4,
      version: 1,
      createdAt: AT,
      updatedAt: AT,
    },
  };
}

const researchClaim: ResearchClaim = {
  unitId: "research-unit",
  leaseToken: "research-lease",
  idempotencyKey: "pattern-hop-a",
  kind: "research.pattern_hop",
  payload: { seed: "synthetic" },
  maxCostReservationCents: 0,
  lastResult: null,
};

function storeFor(
  s: ResearchSession,
  claim: ResearchClaim | null = researchClaim,
): ResearchControllerStore {
  return {
    loadControllerContext: vi.fn(async () => ({
      session: s,
      units: claim
        ? [{
            unitKey: claim.idempotencyKey,
            kind: claim.kind,
            status: "queued" as const,
            attemptCount: 0,
            maxAttempts: 3,
          }]
        : [],
      recentReceipts: [],
    })),
    appendPlannedUnits: vi.fn(async () => ({
      appended: 0,
      existing: 0,
    })),
    loadSession: vi.fn(async () => s),
    claimOne: vi.fn(async () => claim),
    settle: vi.fn(async () => "committed" as const),
    stop: vi.fn(async () => {}),
  };
}

function binding(input?: {
  store?: ResearchControllerStore;
  planner?: ResearchControllerPlanner;
  session?: ResearchSession;
  objectiveId?: string;
}) {
  const s = input?.session ?? session();
  return {
    handoff: {
      ownerId: "owner",
      projectId: "project",
      sessionId: "research-session",
      objectiveId: input?.objectiveId ?? "ark-objective",
      authorizationVersion: "synthetic-v1",
      sourceAccessApproved: true,
      privacyReviewRequired: true as const,
    },
    store: input?.store ?? storeFor(s),
    executor: vi.fn(async () => ({
      sessionId: s.id,
      unitId: researchClaim.unitId,
      idempotencyKey: researchClaim.idempotencyKey,
      status: "checkpointed" as const,
      recordedAt: AT,
      costCents: 0,
      evidenceRefs: ["synthetic:evidence"],
      unresolvedRequiredWork: 2,
      result: { patternHopRunId: "run-1" },
    })),
    planner:
      input?.planner ??
      ({
        plan: vi.fn(async () => ({
          action: "run_next" as const,
          rationale: "The queued research unit is the next bounded step.",
        })),
      } satisfies ResearchControllerPlanner),
  };
}

describe("ARK research controller executor", () => {
  it("persists productive controller work as an ARK executor checkpoint", async () => {
    const registry = new ArkExecutorRegistry();
    const scoped = binding();
    registerArkResearchControllerExecutor({
      registry,
      now: () => new Date(AT),
      resolveTrustedBinding: async () => scoped,
    });

    const executor = registry.get(
      ARK_RESEARCH_CONTROLLER_TASK_KIND,
    )!;
    const heartbeat = vi.fn(async () => {});
    const result = await executor({
      claim: arkClaim(),
      heartbeat,
    });

    expect(heartbeat).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      status: "checkpointed",
      checkpoint: {
        sequence: 5,
        reason: "executor",
        state: {
          kind: "research_controller_reference",
          sessionId: "research-session",
          authorizationVersion: "synthetic-v1",
          plan: "run_next",
          appendedUnits: 0,
          receiptPersisted: true,
          latestEvidenceRefs: ["synthetic:evidence"],
          unresolvedRequiredWork: 2,
          receiptStatus: "checkpointed",
          independentReviewVerified: false,
        },
        resumeAfter: "2026-09-28T21:30:30.000Z",
      },
    });
  });

  it("uses a dependency checkpoint for a no-claim pulse so retries are not reset", async () => {
    const registry = new ArkExecutorRegistry();
    const s = session();
    const scoped = binding({ store: storeFor(s, null), session: s });
    registerArkResearchControllerExecutor({
      registry,
      now: () => new Date(AT),
      resolveTrustedBinding: async () => scoped,
    });

    const result = await registry
      .get(ARK_RESEARCH_CONTROLLER_TASK_KIND)!({
        claim: arkClaim(),
        heartbeat: async () => {},
      });

    expect(result).toMatchObject({
      status: "checkpointed",
      checkpoint: {
        sequence: 5,
        reason: "dependency",
        state: {
          kind: "research_controller_wait_reference",
          receiptPersisted: false,
          latestEvidenceRefs: [],
        },
      },
    });
  });

  it("turns an independent-review planner boundary into an ARK high-consequence block", async () => {
    const registry = new ArkExecutorRegistry();
    const planner: ResearchControllerPlanner = {
      plan: vi.fn(async () => ({
        action: "await_review",
        rationale: "Original source review is required.",
        unresolvedWork: ["independent original-source review"],
      })),
    };
    registerArkResearchControllerExecutor({
      registry,
      now: () => new Date(AT),
      resolveTrustedBinding: async () => binding({ planner }),
    });

    const result = await registry
      .get(ARK_RESEARCH_CONTROLLER_TASK_KIND)!({
        claim: arkClaim(),
        heartbeat: async () => {},
      });

    expect(result).toEqual({
      status: "blocked",
      blocker: {
        kind: "high_consequence_fork",
        message:
          "Research controller reached an independent review boundary: Original source review is required.",
      },
    });
  });

  it("fails closed when no trusted host binding exists", async () => {
    const registry = new ArkExecutorRegistry();
    registerArkResearchControllerExecutor({
      registry,
      resolveTrustedBinding: async () => null,
    });

    await expect(
      registry.get(ARK_RESEARCH_CONTROLLER_TASK_KIND)!({
        claim: arkClaim(),
        heartbeat: async () => {},
      }),
    ).resolves.toMatchObject({
      status: "blocked",
      blocker: {
        kind: "external_authority",
      },
    });
  });

  it("rejects a trusted binding that does not match the leased ARK objective", async () => {
    const registry = new ArkExecutorRegistry();
    registerArkResearchControllerExecutor({
      registry,
      resolveTrustedBinding: async () =>
        binding({ objectiveId: "other-objective" }),
    });

    await expect(
      registry.get(ARK_RESEARCH_CONTROLLER_TASK_KIND)!({
        claim: arkClaim(),
        heartbeat: async () => {},
      }),
    ).rejects.toThrow(
      "research_controller_ark_binding_scope_mismatch",
    );
  });
});

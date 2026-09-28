import { describe, expect, it, vi } from "vitest";
import type { AgentResult } from "@/lib/arbor/agency/openaiAgent";
import type { ResearchSession } from "./sessionPolicy";
import type { ResearchClaim } from "./sessionRunner";
import type { ResearchControllerStore } from "./researchController";
import type { TrustedResearchHandoff } from "./arkResearchHandoff";
import {
  initialResearchWakeState,
} from "./researchWakePolicy";
import { runResearchReinsIteration } from "./researchReinsIteration";

const AT = "2026-09-28T21:00:00.000Z";

function session(overrides: Partial<ResearchSession> = {}): ResearchSession {
  return {
    id: "session",
    userId: "owner",
    projectId: "project",
    objective: "Follow the strongest bounded synthetic evidence lead.",
    status: "running",
    startedAt: "2026-09-28T20:00:00.000Z",
    deadlineAt: "2026-09-28T23:00:00.000Z",
    maxWorkUnits: 20,
    consumedWorkUnits: 2,
    maxCostCents: 100,
    committedCostCents: 4,
    authorized: true,
    cancellationRequested: false,
    unresolvedRequiredWork: 2,
    completedEvidenceRefs: ["synthetic:evidence:0"],
    ...overrides,
  };
}

const handoff: TrustedResearchHandoff = {
  ownerId: "owner",
  projectId: "project",
  sessionId: "session",
  objectiveId: "ark-objective",
  authorizationVersion: "1",
  sourceAccessApproved: true,
  privacyReviewRequired: true,
};

const claim: ResearchClaim = {
  unitId: "unit-1",
  leaseToken: "lease-1",
  idempotencyKey: "timeline-a",
  kind: "research.timeline",
  payload: { source: "synthetic" },
  maxCostReservationCents: 2,
};

function storeFor(s: ResearchSession): ResearchControllerStore {
  return {
    loadControllerContext: vi.fn(async () => ({
      session: s,
      units: [{
        unitKey: "timeline-a",
        kind: "research.timeline",
        status: "queued",
        attemptCount: 0,
        maxAttempts: 3,
      }],
      recentReceipts: [],
    })),
    appendPlannedUnits: vi.fn(async () => ({ appended: 0, existing: 0 })),
    loadSession: vi.fn(async () => s),
    claimOne: vi.fn(async () => claim),
    settle: vi.fn(async () => "committed"),
    stop: vi.fn(async () => {}),
  };
}

function plannerSelectingRunNext() {
  return vi.fn(async (input: any): Promise<AgentResult> => {
    await input.hooks?.onToolSelected?.({
      round: 0,
      name: "research_controller_run_next",
      arguments: {
        rationale: "The queued timeline unit is already the best bounded next step.",
      },
    });
    return {
      status: "checkpointed",
      text: "research_controller_plan_selected",
      responseId: "response-1",
      toolCalls: 0,
    };
  });
}

describe("provider-neutral research reins iteration", () => {
  it("uses canonical Arbor planning, commits one ARK-backed unit, then asks the wake layer to resume", async () => {
    const s = session();
    const store = storeFor(s);
    const runAgent = plannerSelectingRunNext();
    const executor = vi.fn(async () => ({
      sessionId: s.id,
      unitId: claim.unitId,
      idempotencyKey: claim.idempotencyKey,
      status: "completed" as const,
      recordedAt: AT,
      costCents: 1,
      evidenceRefs: ["synthetic:evidence:1"],
      unresolvedRequiredWork: 1,
    }));

    const result = await runResearchReinsIteration({
      handoff,
      store,
      executor,
      plannerInstructions: "CANONICAL ARBOR SYSTEM INSTRUCTIONS",
      plannerContext: {
        userId: "owner",
        projectId: "project",
        conversationId: null,
        turnId: "background-turn-1",
      },
      behaviorRequirements: [
        "continue safe reversible work without asking the user to babysit progress",
      ],
      wakeState: initialResearchWakeState(),
      at: AT,
      runAgent: runAgent as any,
    });

    expect(runAgent).toHaveBeenCalledOnce();
    expect(executor).toHaveBeenCalledOnce();
    expect(store.settle).toHaveBeenCalledOnce();
    expect(result.pulse).toMatchObject({
      status: "checkpointed",
      plan: "run_next",
      appendedUnits: 0,
      checkpoint: {
        sessionId: "session",
        objectiveId: "ark-objective",
        evidenceRefs: ["synthetic:evidence:1"],
        completionVerified: false,
      },
    });
    expect(result.wake).toMatchObject({
      action: "resume",
      delaySeconds: 30,
      reason: "progress_checkpointed",
      state: {
        pulseCount: 1,
        consecutiveNoProgress: 0,
      },
    });
  });

  it("honors STOP before canonical Arbor planning or execution", async () => {
    const s = session({ cancellationRequested: true });
    const store = storeFor(s);
    const runAgent = plannerSelectingRunNext();
    const executor = vi.fn();

    const result = await runResearchReinsIteration({
      handoff,
      store,
      executor,
      plannerInstructions: "CANONICAL ARBOR SYSTEM INSTRUCTIONS",
      plannerContext: {
        userId: "owner",
        projectId: "project",
        turnId: "background-turn-2",
      },
      wakeState: initialResearchWakeState(),
      at: AT,
      runAgent: runAgent as any,
    });

    expect(runAgent).not.toHaveBeenCalled();
    expect(executor).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      pulse: {
        status: "stopped",
        reason: "cancelled_by_owner",
      },
      wake: {
        action: "stop",
        reason: "session_stopped",
      },
    });
  });
});

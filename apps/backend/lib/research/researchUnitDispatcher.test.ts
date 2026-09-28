import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runPatternHopResearch } from "@/lib/memory/patternHopResearch";
import type { ResearchSession } from "./sessionPolicy";
import type { ResearchClaim } from "./sessionRunner";
import {
  buildDefaultResearchUnitDispatcher,
  ResearchUnitDispatcher,
} from "./researchUnitDispatcher";

vi.mock("@/lib/memory/patternHopResearch", () => ({
  runPatternHopResearch: vi.fn(),
}));

const mockPatternHop = vi.mocked(runPatternHopResearch);
const AT = "2026-09-28T21:00:00.000Z";

function session(overrides: Partial<ResearchSession> = {}): ResearchSession {
  return {
    id: "session-1",
    userId: "owner-1",
    projectId: "project-1",
    objective: "Follow the strongest bounded historical evidence lead.",
    status: "running",
    startedAt: "2026-09-28T20:00:00.000Z",
    deadlineAt: "2026-09-28T23:00:00.000Z",
    maxWorkUnits: 20,
    consumedWorkUnits: 2,
    maxCostCents: 100,
    committedCostCents: 3,
    authorized: true,
    cancellationRequested: false,
    unresolvedRequiredWork: 3,
    completedEvidenceRefs: [],
    ...overrides,
  };
}

function claim(overrides: Partial<ResearchClaim> = {}): ResearchClaim {
  return {
    unitId: "unit-1",
    leaseToken: "lease-1",
    idempotencyKey: "pattern-hop-a",
    kind: "research.pattern_hop",
    payload: {
      seed: "checkpoint resume provenance",
      objective: "Trace checkpoint/resume evidence.",
      conversationId: "conversation-1",
      maxDepth: 2,
      maxHopsPerAttempt: 3,
    },
    maxCostReservationCents: 0,
    lastResult: null,
    ...overrides,
  };
}

function patternHopResult(input: {
  runId?: string;
  status?: "active" | "complete" | "exhausted" | "blocked";
  evidenceIds?: string[];
  frontier?: number;
}) {
  const evidence = (input.evidenceIds ?? []).map((id) => ({
    id,
    source: "synthetic",
    sourceThreadId: null,
    sourceMessageId: null,
    speaker: "assistant",
    evidenceType: "direct",
    content: "synthetic evidence",
    occurredAt: AT,
    confidence: 0.9,
    epistemicStatus: "direct",
  }));
  return {
    runId: input.runId ?? "run-1",
    status: input.status ?? "active",
    blocker: input.status === "blocked" ? "synthetic blocker" : null,
    state: {
      status: input.status ?? "active",
      frontier: Array.from({ length: input.frontier ?? 1 }, (_, i) => ({
        evidenceId: "frontier-" + i,
        clue: "synthetic",
        depth: 1,
        branch: "synthetic",
      })),
      completedBranches: [],
      exhaustedBranches: [],
      maxDepth: 2,
    },
    evidence,
    edges: [],
    path: [],
    runtimeProjection: [],
    verificationState: {
      rootBranches: ["direct_matches"],
      foundEvidence: evidence.length,
      edgeCount: 0,
      pathSteps: 0,
      frontierRemaining: input.frontier ?? 1,
      completedBranches: 0,
      exhaustedBranches: 0,
      runtimeProjectionCount: 0,
      absenceSemantics:
        "An exhausted branch means evidence was not found by the attempted routes; it is not proof that the evidence does not exist.",
    },
  } as any;
}

describe("research unit dispatcher", () => {
  beforeEach(() => {
    mockPatternHop.mockReset();
  });

  it("registers only the explicitly allowed default pattern-hop kind", () => {
    const dispatcher = buildDefaultResearchUnitDispatcher({
      supabase: {} as SupabaseClient,
    });
    expect(dispatcher.kinds()).toEqual(["research.pattern_hop"]);
  });

  it("fails closed for an unregistered research kind", async () => {
    const dispatcher = new ResearchUnitDispatcher();
    await expect(dispatcher.executor()({
      session: session(),
      claim: claim({ kind: "research.unknown" }),
      remainingMs: 60_000,
      remainingCostCents: 10,
      at: AT,
    })).rejects.toThrow(
      "research_unit_kind_not_registered:research.unknown",
    );
  });

  it("uses server-scoped session identity and checkpoints a resumable active pattern-hop run", async () => {
    mockPatternHop.mockResolvedValueOnce(patternHopResult({
      runId: "run-1",
      status: "active",
      evidenceIds: ["evidence-1"],
      frontier: 4,
    }));

    const dispatcher = buildDefaultResearchUnitDispatcher({
      supabase: {} as SupabaseClient,
    });
    const receipt = await dispatcher.executor()({
      session: session(),
      claim: claim({
        payload: {
          seed: "checkpoint resume provenance",
          objective: "Trace checkpoint/resume evidence.",
          conversationId: "conversation-1",
          maxDepth: 2,
          maxHopsPerAttempt: 3,
          userId: "spoofed-owner",
          projectId: "spoofed-project",
        },
      }),
      remainingMs: 60_000,
      remainingCostCents: 10,
      at: AT,
    });

    expect(mockPatternHop).toHaveBeenCalledWith(expect.objectContaining({
      userId: "owner-1",
      projectId: "project-1",
      conversationId: "conversation-1",
      seed: "checkpoint resume provenance",
      objective: "Trace checkpoint/resume evidence.",
      maxDepth: 2,
      maxHops: 3,
      runId: undefined,
    }));
    expect(receipt).toMatchObject({
      status: "checkpointed",
      evidenceRefs: ["evidence-1"],
      unresolvedRequiredWork: 3,
      costCents: 0,
      result: {
        patternHopRunId: "run-1",
        patternHopStatus: "active",
        frontierRemaining: 4,
        independentlyVerifiedFinding: false,
      },
    });
  });

  it("resumes from the persisted prior run id and completes only with evidence", async () => {
    mockPatternHop.mockResolvedValueOnce(patternHopResult({
      runId: "run-1",
      status: "complete",
      evidenceIds: ["evidence-1", "evidence-2"],
      frontier: 0,
    }));

    const dispatcher = buildDefaultResearchUnitDispatcher({
      supabase: {} as SupabaseClient,
    });
    const receipt = await dispatcher.executor()({
      session: session(),
      claim: claim({
        lastResult: {
          patternHopRunId: "run-1",
          patternHopStatus: "active",
        },
      }),
      remainingMs: 60_000,
      remainingCostCents: 10,
      at: AT,
    });

    expect(mockPatternHop).toHaveBeenCalledWith(
      expect.objectContaining({ runId: "run-1" }),
    );
    expect(receipt).toMatchObject({
      status: "completed",
      evidenceRefs: ["evidence-1", "evidence-2"],
      unresolvedRequiredWork: 2,
      result: {
        patternHopRunId: "run-1",
        patternHopStatus: "complete",
        independentlyVerifiedFinding: false,
      },
    });
  });

  it("does not turn an exhausted no-evidence search into completion", async () => {
    mockPatternHop.mockResolvedValueOnce(patternHopResult({
      runId: "run-empty",
      status: "exhausted",
      evidenceIds: [],
      frontier: 0,
    }));

    const dispatcher = buildDefaultResearchUnitDispatcher({
      supabase: {} as SupabaseClient,
    });
    const receipt = await dispatcher.executor()({
      session: session(),
      claim: claim(),
      remainingMs: 60_000,
      remainingCostCents: 10,
      at: AT,
    });

    expect(receipt).toMatchObject({
      status: "blocked",
      evidenceRefs: [],
      unresolvedRequiredWork: 3,
      result: {
        patternHopRunId: "run-empty",
        patternHopStatus: "exhausted",
        foundEvidence: 0,
        independentlyVerifiedFinding: false,
      },
    });
  });

  it("rejects a payload/prior run id conflict rather than silently forking the graph", async () => {
    const dispatcher = buildDefaultResearchUnitDispatcher({
      supabase: {} as SupabaseClient,
    });
    await expect(dispatcher.executor()({
      session: session(),
      claim: claim({
        payload: {
          seed: "checkpoint resume provenance",
          runId: "payload-run",
        },
        lastResult: {
          patternHopRunId: "persisted-run",
        },
      }),
      remainingMs: 60_000,
      remainingCostCents: 10,
      at: AT,
    })).rejects.toThrow("research_pattern_hop_run_id_conflict");
    expect(mockPatternHop).not.toHaveBeenCalled();
  });

  it("rejects planner attempts to widen the per-pulse pattern-hop budget", async () => {
    const dispatcher = buildDefaultResearchUnitDispatcher({
      supabase: {} as SupabaseClient,
    });
    await expect(dispatcher.executor()({
      session: session(),
      claim: claim({
        payload: {
          seed: "checkpoint resume provenance",
          maxDepth: 7,
          maxHopsPerAttempt: 9,
        },
      }),
      remainingMs: 60_000,
      remainingCostCents: 10,
      at: AT,
    })).rejects.toThrow(/invalid_research_pattern_hop_/);
    expect(mockPatternHop).not.toHaveBeenCalled();
  });
});

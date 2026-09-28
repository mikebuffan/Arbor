import { describe, expect, it, vi } from "vitest";

import { ArkExecutorRegistry } from "@/lib/ark/executorRegistry";
import { registerArkPreviewResearchExecutor } from "@/lib/ark/previewResearchExecutor";
import type { ArkClaim } from "@/lib/ark/types";

const OBJECTIVE = "11111111-1111-4111-8111-111111111111";
const RUN = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-09-27T12:00:00.000Z");

function claim(overrides: Partial<ArkClaim["task"]> = {}): ArkClaim {
  return {
    objective: {
      id: OBJECTIVE,
      userId: "33333333-3333-4333-8333-333333333333",
      projectId: "44444444-4444-4444-8444-444444444444",
    },
    task: {
      id: "55555555-5555-4555-8555-555555555555",
      payload: {
        seed: "recovery decision",
        objective: "Build a timeline",
        conversationId: null,
        maxDepth: 4,
        maxHopsPerAttempt: 3,
      },
      checkpointSequence: 0,
      attemptCount: 1,
      ...overrides,
    },
  } as ArkClaim;
}

function supabaseWithCheckpoint(state: Record<string, unknown> | null) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: state ? { state } : null,
    error: null,
  });
  const chain = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle,
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return { client: { from: vi.fn().mockReturnValue(chain) } as never, maybeSingle };
}

function outcome(status: "active" | "complete" | "blocked" | "exhausted") {
  return {
    runId: RUN,
    status,
    blocker: status === "blocked" ? "all sources failed" : null,
    state: { status }, evidence: [], edges: [], path: [], runtimeProjection: [],
    verificationState: {
      foundEvidence: 2,
      edgeCount: 1,
      pathSteps: 1,
      frontierRemaining: status === "active" ? 9 : 0,
      completedBranches: 2,
      exhaustedBranches: 1,
    },
  } as never;
}

describe("isolated Preview research executor", () => {
  it("is absent from an ordinary registry", () => {
    expect(new ArkExecutorRegistry().get("ark.preview-research")).toBeNull();
  });

  it("checkpoints only a run id and progress counts", async () => {
    const registry = new ArkExecutorRegistry();
    const { client } = supabaseWithCheckpoint(null);
    const runResearch = vi.fn().mockResolvedValue(outcome("active"));
    registerArkPreviewResearchExecutor({
      registry, supabase: client, pinnedObjectiveId: OBJECTIVE,
      now: () => NOW, runResearch,
    });
    const heartbeat = vi.fn().mockResolvedValue(undefined);
    const result = await registry.get("ark.preview-research")!({ claim: claim(), heartbeat });
    expect(result).toEqual({
      status: "checkpointed",
      checkpoint: {
        sequence: 1,
        state: {
          runId: RUN,
          status: "active",
          frontierRemaining: 9,
          completedBranches: 2,
          exhaustedBranches: 1,
        },
        nextAction: "Resume bounded Preview research",
        reason: "budget",
        resumeAfter: "2026-09-27T12:00:01.000Z",
      },
    });
    expect(heartbeat).toHaveBeenCalledTimes(2);
  });

  it("resumes the latest durable run and returns minimal verified completion", async () => {
    const registry = new ArkExecutorRegistry();
    const { client } = supabaseWithCheckpoint({ runId: RUN, privateEvidence: "ignored" });
    const runResearch = vi.fn().mockResolvedValue(outcome("complete"));
    registerArkPreviewResearchExecutor({ registry, supabase: client, pinnedObjectiveId: OBJECTIVE, runResearch });
    const result = await registry.get("ark.preview-research")!({
      claim: claim({ checkpointSequence: 1, attemptCount: 2 }), heartbeat: async () => {},
    });
    expect(runResearch).toHaveBeenCalledWith(expect.objectContaining({ runId: RUN }));
    expect(result).toMatchObject({
      status: "completed",
      result: {
        verified: true,
        capability: "ark.preview-research",
        attempts: 2,
        runId: RUN,
        status: "complete",
        verification: { foundEvidence: 2, edgeCount: 1, pathSteps: 1 },
      },
    });
    expect(JSON.stringify(result)).not.toContain("privateEvidence");
  });

  it("refuses another objective and malformed payload before any research", async () => {
    const registry = new ArkExecutorRegistry();
    const { client } = supabaseWithCheckpoint(null);
    const runResearch = vi.fn();
    registerArkPreviewResearchExecutor({ registry, supabase: client, pinnedObjectiveId: OBJECTIVE, runResearch });
    const executor = registry.get("ark.preview-research")!;
    const other = claim();
    other.objective.id = "66666666-6666-4666-8666-666666666666";
    expect(await executor({ claim: other, heartbeat: vi.fn() })).toMatchObject({ status: "blocked" });
    expect(await executor({
      claim: claim({ payload: { seed: "x", maxDepth: 99 } }), heartbeat: vi.fn(),
    })).toMatchObject({ status: "blocked" });
    expect(runResearch).not.toHaveBeenCalled();
  });

  it("retries a transient all-source failure without claiming completion", async () => {
    const registry = new ArkExecutorRegistry();
    const { client } = supabaseWithCheckpoint(null);
    registerArkPreviewResearchExecutor({
      registry, supabase: client, pinnedObjectiveId: OBJECTIVE,
      runResearch: vi.fn().mockResolvedValue(outcome("blocked")),
    });
    expect(await registry.get("ark.preview-research")!({ claim: claim(), heartbeat: async () => {} }))
      .toEqual({ status: "failed", error: "all sources failed", retryable: true, retryAfterMs: 5_000 });
  });
});

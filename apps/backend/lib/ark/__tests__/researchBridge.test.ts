import { describe, expect, it, vi } from "vitest";

import { enqueueArkResearchObjective } from "@/lib/ark/researchBridge";

const NOW = "2026-09-27T12:00:00.000Z";

describe("ARK Preview research bridge", () => {
  it("enqueues one narrow, deterministic research task", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: "55555555-5555-4555-8555-555555555555",
        user_id: "11111111-1111-4111-8111-111111111111",
        project_id: "22222222-2222-4222-8222-222222222222",
        goal: "Build a timeline",
        status: "queued",
        priority: 0,
        budget: { maxTasksPerCycle: 1, maxRuntimeMs: 20_000, maxAttemptsPerTask: 12 },
        blocker: null,
        completion_evidence: null,
        version: 1,
        created_at: NOW,
        updated_at: NOW,
      },
      error: null,
    });
    await enqueueArkResearchObjective({
      supabase: { rpc } as never,
      userId: "11111111-1111-4111-8111-111111111111",
      projectId: "22222222-2222-4222-8222-222222222222",
      conversationId: "33333333-3333-4333-8333-333333333333",
      clientRequestId: "44444444-4444-4444-8444-444444444444",
      seed: "recovery decision",
      objective: "Build a timeline",
      maxDepth: 4,
      maxHopsPerAttempt: 3,
    });

    expect(rpc).toHaveBeenCalledExactlyOnceWith("ark_enqueue_objective", expect.objectContaining({
      p_idempotency_key: "mcp-research:44444444-4444-4444-8444-444444444444",
      p_budget: { maxTasksPerCycle: 1, maxRuntimeMs: 20_000, maxAttemptsPerTask: 12 },
      p_tasks: [{
        task_key: "research",
        kind: "ark.preview-research",
        description: "Run or resume bounded Arbor project-history pattern-hop research",
        dependencies: [],
        payload: {
          seed: "recovery decision",
          objective: "Build a timeline",
          conversationId: "33333333-3333-4333-8333-333333333333",
          maxDepth: 4,
          maxHopsPerAttempt: 3,
        },
        max_attempts: 12,
        idempotency_key: "mcp-research:44444444-4444-4444-8444-444444444444:research",
      }],
    }));
  });
});

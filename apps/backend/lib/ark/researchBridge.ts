import type { SupabaseClient } from "@supabase/supabase-js";

import { SupabaseArkStore } from "./supabaseStore";
import type { ArkObjective } from "./types";

export async function enqueueArkResearchObjective(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId?: string | null;
  clientRequestId: string;
  seed: string;
  objective?: string | null;
  maxDepth: number;
  maxHopsPerAttempt: number;
}): Promise<ArkObjective> {
  const idempotencyKey = `mcp-research:${input.clientRequestId}`;
  return new SupabaseArkStore(input.supabase).enqueueObjective({
    userId: input.userId,
    projectId: input.projectId,
    goal: input.objective ?? `Research: ${input.seed}`,
    budget: {
      maxTasksPerCycle: 1,
      maxRuntimeMs: 20_000,
      maxAttemptsPerTask: 12,
    },
    idempotencyKey,
    tasks: [{
      taskKey: "research",
      kind: "ark.preview-research",
      description: "Run or resume bounded Arbor project-history pattern-hop research",
      payload: {
        seed: input.seed,
        objective: input.objective ?? null,
        conversationId: input.conversationId ?? null,
        maxDepth: input.maxDepth,
        maxHopsPerAttempt: input.maxHopsPerAttempt,
      },
      maxAttempts: 12,
      idempotencyKey: `${idempotencyKey}:research`,
    }],
  });
}

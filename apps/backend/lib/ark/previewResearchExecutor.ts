import type { SupabaseClient } from "@supabase/supabase-js";

import { runPatternHopResearch } from "@/lib/memory/patternHopResearch";
import type { ArkExecutorRegistry } from "./executorRegistry";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAYLOAD_KEYS = new Set([
  "seed",
  "objective",
  "conversationId",
  "maxDepth",
  "maxHopsPerAttempt",
]);

type ResearchOutcome = Awaited<ReturnType<typeof runPatternHopResearch>>;

function boundedInteger(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function parsePayload(payload: Record<string, unknown>) {
  if (Object.keys(payload).some((key) => !PAYLOAD_KEYS.has(key))) {
    throw new Error("ark_preview_research_invalid_payload");
  }
  const seed = payload.seed;
  const objective = payload.objective;
  const conversationId = payload.conversationId;
  const maxDepth = payload.maxDepth;
  const maxHopsPerAttempt = payload.maxHopsPerAttempt;
  if (
    typeof seed !== "string" || seed.length < 2 || seed.length > 4000 ||
    (objective !== null && objective !== undefined &&
      (typeof objective !== "string" || objective.length < 2 || objective.length > 4000)) ||
    (conversationId !== null && conversationId !== undefined &&
      (typeof conversationId !== "string" || !UUID.test(conversationId))) ||
    !boundedInteger(maxDepth, 1, 6) ||
    !boundedInteger(maxHopsPerAttempt, 1, 8)
  ) {
    throw new Error("ark_preview_research_invalid_payload");
  }
  return {
    seed,
    objective: typeof objective === "string" ? objective : undefined,
    conversationId: typeof conversationId === "string" ? conversationId : null,
    maxDepth,
    maxHopsPerAttempt,
  };
}

async function latestRunId(supabase: SupabaseClient, taskId: string): Promise<string | undefined> {
  const { data, error } = await supabase
    .from("ark_checkpoints")
    .select("state")
    .eq("task_id", taskId)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const state = data?.state;
  if (!state || typeof state !== "object" || Array.isArray(state)) return undefined;
  const runId = (state as Record<string, unknown>).runId;
  return typeof runId === "string" && UUID.test(runId) ? runId : undefined;
}

export function registerArkPreviewResearchExecutor(input: {
  registry: ArkExecutorRegistry;
  supabase: SupabaseClient;
  pinnedObjectiveId: string;
  now?: () => Date;
  runResearch?: typeof runPatternHopResearch;
}): void {
  const now = input.now ?? (() => new Date());
  const runResearch = input.runResearch ?? runPatternHopResearch;
  input.registry.register("ark.preview-research", async ({ claim, heartbeat }) => {
    if (claim.objective.id !== input.pinnedObjectiveId) {
      return {
        status: "blocked",
        blocker: {
          kind: "unsupported_capability",
          message: "Preview research is not authorized for this objective",
        },
      };
    }

    let payload: ReturnType<typeof parsePayload>;
    try {
      payload = parsePayload(claim.task.payload);
    } catch {
      return {
        status: "blocked",
        blocker: {
          kind: "unsupported_capability",
          message: "Preview research payload failed validation",
        },
      };
    }

    await heartbeat();
    const runId = await latestRunId(input.supabase, claim.task.id);
    const outcome: ResearchOutcome = await runResearch({
      supabase: input.supabase,
      userId: claim.objective.userId,
      projectId: claim.objective.projectId,
      conversationId: payload.conversationId,
      seed: payload.seed,
      objective: payload.objective,
      maxDepth: payload.maxDepth,
      maxHops: payload.maxHopsPerAttempt,
      runId,
    });
    await heartbeat();

    if (outcome.status === "blocked") {
      return {
        status: "failed",
        error: outcome.blocker ?? "ark_preview_research_blocked",
        retryable: true,
        retryAfterMs: 5_000,
      };
    }

    if (outcome.status === "active") {
      return {
        status: "checkpointed",
        checkpoint: {
          sequence: claim.task.checkpointSequence + 1,
          state: {
            runId: outcome.runId,
            status: outcome.status,
            frontierRemaining: outcome.verificationState.frontierRemaining,
            completedBranches: outcome.verificationState.completedBranches,
            exhaustedBranches: outcome.verificationState.exhaustedBranches,
          },
          nextAction: "Resume bounded Preview research",
          reason: "budget",
          resumeAfter: new Date(now().getTime() + 1_000).toISOString(),
        },
      };
    }

    return {
      status: "completed",
      result: {
        verified: true,
        capability: "ark.preview-research",
        attempts: claim.task.attemptCount,
        runId: outcome.runId,
        status: outcome.status,
        checkpointSequence: claim.task.checkpointSequence,
        verification: {
          foundEvidence: outcome.verificationState.foundEvidence,
          edgeCount: outcome.verificationState.edgeCount,
          pathSteps: outcome.verificationState.pathSteps,
          completedBranches: outcome.verificationState.completedBranches,
          exhaustedBranches: outcome.verificationState.exhaustedBranches,
        },
      },
    };
  });
}

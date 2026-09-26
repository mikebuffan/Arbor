import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { enqueueArkAgencyToolPlan } from "@/lib/ark/agencyBridge";
import { assertConversationOwnedByUser, assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { arkMcpUserContext } from "./context";
import {
  arkSubmissionEnvironment,
  assertArkSubmissionCaller,
  isArkSubmissionHost,
} from "./arkSubmissionGate";

const SubmitAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function result<T extends Record<string, unknown>>(value: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

/**
 * Register one deliberately narrow write crossing. It only enqueues bounded
 * project-owned research; it cannot run a worker or enable execution.
 */
export function registerArkSubmissionTool(server: McpServer): void {
  const env = arkSubmissionEnvironment();
  if (!isArkSubmissionHost(env)) return;

  server.registerTool(
    "submit_ark_research",
    {
      title: "Submit ARK Research",
      description:
        "Queue one bounded, resumable ARK historical-research objective for an owned Preview project. This does not start execution.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        conversationId: z.string().uuid().optional(),
        clientRequestId: z.string().uuid(),
        seed: z.string().min(2).max(4000),
        objective: z.string().min(2).max(4000).optional(),
        maxDepth: z.number().int().min(1).max(6).default(4),
        maxHopsPerAttempt: z.number().int().min(1).max(8).default(4),
      }),
      outputSchema: z.object({
        accepted: z.literal(true),
        objectiveId: z.string().uuid(),
        status: z.string(),
        executionStarted: z.literal(false),
      }),
      annotations: SubmitAnnotations,
    },
    async (input, ctx) => {
      assertArkSubmissionCaller(ctx, env);
      const { userId, supabase } = arkMcpUserContext(ctx);
      await assertProjectOwnedByUser(supabase, userId, input.projectId);
      if (input.conversationId) {
        await assertConversationOwnedByUser({
          supabase,
          userId,
          projectId: input.projectId,
          conversationId: input.conversationId,
        });
      }

      const planId = `mcp-research:${input.clientRequestId}`;
      const objective = await enqueueArkAgencyToolPlan({
        supabase: supabaseAdmin(),
        userId,
        projectId: input.projectId,
        conversationId: input.conversationId ?? null,
        turnId: input.clientRequestId,
        goal: input.objective ?? `Research: ${input.seed}`,
        planId,
        budget: {
          maxTasksPerCycle: 1,
          maxRuntimeMs: 20_000,
          maxAttemptsPerTask: 12,
        },
        steps: [{
          id: "research",
          description: "Run or resume bounded pattern-hop research",
          capability: "arbor_pattern_hop_research",
          arguments: {
            seed: input.seed,
            objective: input.objective ?? null,
            runId: null,
            maxDepth: input.maxDepth,
            maxHops: input.maxHopsPerAttempt,
          },
          maxAttempts: 12,
        }],
      });

      return result({
        accepted: true as const,
        objectiveId: objective.id,
        status: objective.status,
        executionStarted: false as const,
      });
    },
  );
}

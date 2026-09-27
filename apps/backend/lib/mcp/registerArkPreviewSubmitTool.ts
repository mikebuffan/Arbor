import "server-only";

import { createHash } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { SupabaseArkStore } from "@/lib/ark/supabaseStore";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { arkMcpUserContext } from "./context";

const SEED = "Review the existing Arbor project history for checkpoint/resume safeguard patterns and summarize only provenance-preserving implementation lessons.";

export function registerArkPreviewSubmitTool(server: McpServer): void {
  server.registerTool(
    "submit_ark_preview_research_objective",
    {
      title: "Submit ARK Preview Research Objective",
      description: "Queue exactly one bounded Preview research task for an owned project. This never starts execution; the research task kind is excluded from worker claims until separately enabled.",
      inputSchema: z.object({
        projectId: z.string().uuid(),
        seed: z.literal(SEED),
        maxDepth: z.literal(2),
        maxHopsPerAttempt: z.literal(2),
      }),
      outputSchema: z.object({
        objectiveId: z.string().uuid(),
        status: z.literal("queued"),
        taskKind: z.literal("ark.preview-research"),
        executionStarted: z.literal(false),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, seed, maxDepth, maxHopsPerAttempt }, ctx) => {
      const allowedClientId = process.env.ARBOR_ARK_PREVIEW_QUEUE_CLIENT_ID?.trim();
      if (!allowedClientId || ctx.http?.authInfo?.extra?.verifiedClientId !== allowedClientId) {
        throw new Error("ark_preview_queue_client_not_authorized");
      }
      const { userId, supabase } = arkMcpUserContext(ctx);
      await assertProjectOwnedByUser(supabase, userId, projectId);
      // The database enforces uniqueness of this key and rejects a changed payload.
      const idempotencyKey = createHash("sha256")
        .update(JSON.stringify(["ark.preview-research.v1", userId, projectId, seed, maxDepth, maxHopsPerAttempt]))
        .digest("hex");
      const store = new SupabaseArkStore(supabaseAdmin());
      const objective = await store.enqueueObjective({
        userId,
        projectId,
        goal: seed,
        idempotencyKey,
        budget: { maxTasksPerCycle: 1, maxRuntimeMs: 25_000, maxAttemptsPerTask: 1 },
        tasks: [{
          taskKey: "research-preview",
          kind: "ark.preview-research",
          description: seed,
          payload: { seed, maxDepth, maxHopsPerAttempt, previewOnly: true },
          maxAttempts: 1,
          idempotencyKey: `${idempotencyKey}:task`,
        }],
      });
      if (objective.status !== "queued") throw new Error("ark_preview_objective_already_advanced");
      const value = { objectiveId: objective.id, status: "queued" as const, taskKind: "ark.preview-research" as const, executionStarted: false as const };
      return { content: [{ type: "text" as const, text: JSON.stringify(value) }], structuredContent: value };
    },
  );
}

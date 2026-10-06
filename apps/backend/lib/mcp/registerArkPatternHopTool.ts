import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enqueueArkAgencyToolPlan } from "@/lib/ark/agencyBridge";
import { promptDataBlock } from "@/lib/arbor/promptData";
import { arkMcpUserContext } from "./context";
import { assertArkPatternHopSubmission, isArkPatternHopSubmissionEnabled } from "./taskPermissions";

export const ArkPatternHopRequest = z.object({
  projectId: z.string().uuid(), requestId: z.string().uuid(),
  seed: z.string().trim().min(2).max(2000),
  runId: z.string().uuid().nullable(),
  maxHops: z.number().int().min(1).max(8),
  maxDepth: z.number().int().min(1).max(3),
}).strict();

/** One explicitly requested historical research pass. Reuses the agency worker;
 * no corpus ingestion, scheduler, learning write, or arbitrary capability. */
export function registerArkPatternHopTool(server: McpServer): void {
  if (!isArkPatternHopSubmissionEnabled()) return;
  server.registerTool("submit_ark_pattern_hop_pass", {
    title: "Submit a Bounded Pattern Hop Pass",
    description: "Queue one user-requested Pattern Hop pass over owned historical memory/timeline records, preserving sources. Writes queue/research state; requires a separate client/project Pattern Hop grant. Reuse requestId on retries. A queued task is not execution, and a completed pass is not an exhausted investigation. To continue, use the returned runId with a new requestId and unchanged seed. No external-document ingestion, edits, learning, deployment or background scheduler.",
    inputSchema: ArkPatternHopRequest,
    outputSchema: z.object({projectId: z.string().uuid(), requestId: z.string().uuid(),
      objectiveId: z.string().uuid(), taskId: z.string().uuid(), status: z.string(),
      submitted: z.literal(true), researchCompletionVerified: z.literal(false)}),
    annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false},
  }, async (raw, ctx) => {
    const input = ArkPatternHopRequest.parse(raw);
    assertArkPatternHopSubmission(ctx, input.projectId);
    const { userId, supabase } = arkMcpUserContext(ctx);
    await assertProjectOwnedByUser(supabase, userId, input.projectId);
    if (input.runId) {
      const {data, error} = await supabase.from("arbor_pattern_hop_runs")
        .select("id,user_id,project_id,seed,max_depth,status")
        .eq("id", input.runId).eq("user_id", userId).eq("project_id", input.projectId).maybeSingle();
      if (error) throw error;
      if (!data || data.id !== input.runId || data.user_id !== userId || data.project_id !== input.projectId)
        throw new Error("pattern_hop_run_not_found");
      if (data.seed?.clue !== input.seed || data.max_depth !== input.maxDepth)
        throw new Error("pattern_hop_resume_input_mismatch");
    }
    const objective = await enqueueArkAgencyToolPlan({
      supabase: supabaseAdmin(), userId, projectId: input.projectId, turnId: input.requestId,
      goal: "Perform one bounded historical Pattern Hop pass",
      planId: `mcp-pattern-hop:${input.requestId}`,
      steps: [{id: "pattern-hop-1", description: "Trace owned historical evidence with provenance",
        capability: "arbor_pattern_hop_research", arguments: {seed: input.seed, objective: null,
          runId: input.runId, maxDepth: input.maxDepth, maxHops: input.maxHops}, maxAttempts: 1}],
      budget: {maxTasksPerCycle: 1, maxRuntimeMs: 20000, maxAttemptsPerTask: 1},
    });
    if (objective.userId !== userId || objective.projectId !== input.projectId) throw new Error("ark_enqueue_scope_mismatch");
    const {data, error} = await supabase.from("ark_tasks").select("id,user_id,project_id,status")
      .eq("objective_id", objective.id).eq("task_key", "pattern-hop-1")
      .eq("user_id", userId).eq("project_id", input.projectId).maybeSingle();
    if (error) throw error;
    if (!data || data.user_id !== userId || data.project_id !== input.projectId)
      throw new Error("ark_submitted_task_readback_unavailable_retry_same_request_id");
    const value = {projectId: input.projectId, requestId: input.requestId, objectiveId: objective.id,
      taskId: data.id, status: data.status, submitted: true as const, researchCompletionVerified: false as const};
    return {content: [{type: "text" as const, text: promptDataBlock("ARK PATTERN HOP TASK RECEIPT", value)}], structuredContent: value};
  });
}

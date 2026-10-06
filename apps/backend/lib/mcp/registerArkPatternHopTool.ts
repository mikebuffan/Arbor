import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enqueueArkAgencyToolPlan } from "@/lib/ark/agencyBridge";
import { promptDataBlock } from "@/lib/arbor/promptData";
import { arkMcpUserContext } from "./context";
import { assertArkPatternHopSubmission, isArkPatternHopSubmissionEnabled } from "./taskPermissions";
import {
  isPatternHopRunControlEnabled,
  requestPatternHopStop,
  resumePatternHopRun,
} from "@/lib/memory/patternHopRunControl";
import { loadPatternHopRun } from "@/lib/memory/patternHopStore";

export const ArkPatternHopRequest = z.object({
  projectId: z.string().uuid(), requestId: z.string().uuid(),
  seed: z.string().trim().min(2).max(2000),
  runId: z.string().uuid().nullable(),
  maxHops: z.number().int().min(1).max(8),
  maxDepth: z.number().int().min(1).max(3),
}).strict();
export const ArkPatternHopControlRequest = z.object({
  projectId: z.string().uuid(),
  runId: z.string().uuid(),
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

  if (!isPatternHopRunControlEnabled()) return;

  server.registerTool("stop_ark_pattern_hop_run", {
    title: "Stop a Pattern Hop Run",
    description: "Durably request STOP for one owned Pattern Hop run. The latch survives process restart. An in-flight provider call may finish, but a run-control-enabled worker rechecks the durable latch before persisting traversal advancement. This does not delete evidence or cancel unrelated ARK work.",
    inputSchema: ArkPatternHopControlRequest,
    outputSchema: z.object({projectId:z.string().uuid(),runId:z.string().uuid(),
      status:z.enum(["requested","already_stopped"]),durable:z.literal(true)}),
    annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false},
  }, async(raw,ctx)=>{
    if(!isPatternHopRunControlEnabled()) throw new Error("pattern_hop_run_control_disabled");
    const input=ArkPatternHopControlRequest.parse(raw);
    assertArkPatternHopSubmission(ctx,input.projectId);
    const {userId,supabase}=arkMcpUserContext(ctx);
    await assertProjectOwnedByUser(supabase,userId,input.projectId);
    const run=await loadPatternHopRun({supabase,userId,projectId:input.projectId,runId:input.runId});
    if(!run) throw new Error("pattern_hop_run_not_found");
    const status=await requestPatternHopStop({supabase,userId,projectId:input.projectId,runId:input.runId});
    const value={projectId:input.projectId,runId:input.runId,status,durable:true as const};
    return {content:[{type:"text" as const,text:promptDataBlock("PATTERN HOP STOP RECEIPT",value)}],structuredContent:value};
  });

  server.registerTool("resume_ark_pattern_hop_run", {
    title: "Resume a Stopped Pattern Hop Run",
    description: "Explicitly clear the durable STOP latch for one owned Pattern Hop run after no active run lease remains. This does not execute a pass; submit a new bounded pass separately.",
    inputSchema: ArkPatternHopControlRequest,
    outputSchema: z.object({projectId:z.string().uuid(),runId:z.string().uuid(),
      status:z.enum(["resumed","not_stopped"]),executed:z.literal(false)}),
    annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false},
  }, async(raw,ctx)=>{
    if(!isPatternHopRunControlEnabled()) throw new Error("pattern_hop_run_control_disabled");
    const input=ArkPatternHopControlRequest.parse(raw);
    assertArkPatternHopSubmission(ctx,input.projectId);
    const {userId,supabase}=arkMcpUserContext(ctx);
    await assertProjectOwnedByUser(supabase,userId,input.projectId);
    const run=await loadPatternHopRun({supabase,userId,projectId:input.projectId,runId:input.runId});
    if(!run) throw new Error("pattern_hop_run_not_found");
    const status=await resumePatternHopRun({supabase,userId,projectId:input.projectId,runId:input.runId});
    const value={projectId:input.projectId,runId:input.runId,status,executed:false as const};
    return {content:[{type:"text" as const,text:promptDataBlock("PATTERN HOP RESUME RECEIPT",value)}],structuredContent:value};
  });
}

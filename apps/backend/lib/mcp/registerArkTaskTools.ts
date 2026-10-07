import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enqueueArkAgencyToolPlan } from "@/lib/ark/agencyBridge";
import { promptDataBlock } from "@/lib/arbor/promptData";
import { arkMcpUserContext } from "./context";
import { assertArkReadTaskSubmission, isArkMcpSubmissionEnabled } from "./taskPermissions";
import {ArchiveReadInput} from "@/lib/memory/archiveReader";
import { registerArkPatternHopTool } from "./registerArkPatternHopTool";
import { arkTaskReadbackFlags } from "@/lib/ark/taskStatus";

export const ArkReadTaskRequest = z.object({
  projectId: z.string().uuid(),
  requestId: z.string().uuid().describe("Reuse this same ID on retries; changed input with the same ID is rejected."),
  capability: z.enum(["arbor_read_runtime_state", "annabelle_read_workspace","arbor_read_historical_archive_page"]),
  archiveRead:ArchiveReadInput.optional(),
}).strict().superRefine((value,ctx)=>{
  if(value.archiveRead&&value.capability!=="arbor_read_historical_archive_page")ctx.addIssue({code:"custom",message:"archiveRead requires the archive reader capability"});
});

function result(value: Record<string, unknown>) {
  return {content: [{type: "text" as const, text: promptDataBlock("ARK TASK RECEIPT", value)}], structuredContent: value};
}

export function registerArkTaskTools(server: McpServer): void {
  // Reading an already-owned result stays available even if submission is off.
  server.registerTool("get_ark_task_result", {
    title: "Get ARK Task Result",
    description: "Use a task ID from an ARK receipt to read its durable status and result. Queued, running, blocked and failed remain distinct from completed. Does not execute or retry work.",
    inputSchema: z.object({projectId: z.string().uuid(), taskId: z.string().uuid()}).strict(),
    outputSchema: z.object({projectId: z.string().uuid(), taskId: z.string().uuid(), objectiveId: z.string().uuid(),
      status: z.string(), resultJson: z.string(), resultTruncated: z.boolean(), lastError: z.string().nullable(),
      attemptCount: z.number(), terminal: z.boolean(), completed: z.boolean(), capturedAt: z.string()}),
    annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false},
  }, async (raw, ctx) => {
    const input = z.object({projectId: z.string().uuid(), taskId: z.string().uuid()}).strict().parse(raw);
    const {userId, supabase} = arkMcpUserContext(ctx);
    await assertProjectOwnedByUser(supabase, userId, input.projectId);
    const {data, error} = await supabase.from("ark_tasks")
      .select("id,objective_id,user_id,project_id,status,result,last_error,attempt_count")
      .eq("id", input.taskId).eq("user_id", userId).eq("project_id", input.projectId).maybeSingle();
    if (error) throw error;
    if (!data || data.id !== input.taskId || data.user_id !== userId || data.project_id !== input.projectId)
      throw new Error("ark_task_not_found");
    const encoded = JSON.stringify(data.result ?? null);
    const flags=arkTaskReadbackFlags(String(data.status));
    return result({projectId: input.projectId, taskId: data.id, objectiveId: data.objective_id,
      status: data.status, resultJson: encoded.slice(0, 20000), resultTruncated: encoded.length > 20000,
      lastError: typeof data.last_error === "string" ? data.last_error.slice(0, 2000) : null,
      attemptCount: data.attempt_count, ...flags, capturedAt: new Date().toISOString()});
  });

  registerArkPatternHopTool(server);
  if (!isArkMcpSubmissionEnabled()) return;
  server.registerTool("submit_ark_read_task", {
    title: "Submit a Bounded ARK Read Task",
    description: "Queue one existing runtime-state, Annabelle-workspace or chronological archive-page read in ARK when the user requests it. Writes durable queue state and returns a task ID; submission is not execution or completion. Requires an explicit server-side client/project grant. Reuse requestId on retries. Cannot submit arbitrary code, research, manuscript edits, deployments or other capabilities.",
    inputSchema: ArkReadTaskRequest,
    outputSchema: z.object({projectId: z.string().uuid(), requestId: z.string().uuid(), objectiveId: z.string().uuid(),
      taskId: z.string().uuid(), status: z.string(), submitted: z.literal(true), completed: z.boolean()}),
    annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false},
  }, async (raw, ctx) => {
    const input = ArkReadTaskRequest.parse(raw);
    assertArkReadTaskSubmission(ctx, input.projectId);
    const {userId, supabase} = arkMcpUserContext(ctx);
    // User-scoped ownership must pass BEFORE obtaining the privileged queue
    // client. The existing enqueue RPC is service_role-only and also checks
    // project ownership and atomic request_hash/idempotency integrity.
    await assertProjectOwnedByUser(supabase, userId, input.projectId);
    const objective = await enqueueArkAgencyToolPlan({
      supabase: supabaseAdmin(), userId, projectId: input.projectId, turnId: input.requestId,
      goal: `Read existing state through ${input.capability}`,
      planId: `mcp-read:${input.requestId}`,
      steps: [{id: "read-1", description: `Read through ${input.capability}`, capability: input.capability,
        arguments: input.capability==="arbor_read_historical_archive_page"?input.archiveRead??{}:{}, maxAttempts: 1}],
      budget: {maxTasksPerCycle: 1, maxRuntimeMs: 20000, maxAttemptsPerTask: 1},
    });
    if (objective.userId !== userId || objective.projectId !== input.projectId)
      throw new Error("ark_enqueue_scope_mismatch");
    const {data, error} = await supabase.from("ark_tasks").select("id,user_id,project_id,status")
      .eq("objective_id", objective.id).eq("task_key", "read-1")
      .eq("user_id", userId).eq("project_id", input.projectId).maybeSingle();
    if (error) throw error;
    if (!data || data.user_id !== userId || data.project_id !== input.projectId)
      throw new Error("ark_submitted_task_readback_unavailable_retry_same_request_id");
    return result({projectId: input.projectId, requestId: input.requestId, objectiveId: objective.id,
      taskId: data.id, status: data.status, submitted: true, completed: data.status === "completed"});
  });
}

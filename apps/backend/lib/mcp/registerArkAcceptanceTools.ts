import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SupabaseArkStore } from "@/lib/ark/supabaseStore";
import { ACCEPTANCE_TASK_KIND, ACCEPTANCE_CASE_IDS, acceptanceContract, acceptanceObjectiveKey } from "@/lib/ark/acceptanceContract";
import { arkMcpUserContext } from "./context";
import { assertArkAcceptanceSubmission, isArkAcceptanceSubmissionEnabled } from "./taskPermissions";

export const ArkAcceptanceRequest = z.object({ projectId: z.string().uuid(), requestId: z.string().uuid(),
  caseId: z.string().refine(id => ACCEPTANCE_CASE_IDS.includes(id), "Unknown checked-in case") }).strict();

export function registerArkAcceptanceTools(server: McpServer) {
  if (!isArkAcceptanceSubmissionEnabled()) return;
  server.registerTool("start_ark_behavior_test", {
    title: "Queue One Bounded Arbor Behavior Comparison",
    description: "When requested, queue one checked-in synthetic A/B test on the existing host. Paid model generation occurs only through the approved worker. Returns owned task IDs, not a completion claim. One run per case and server-reviewed campaign; retries and new request IDs cannot start duplicate runs. No arbitrary code, prompts, model overrides or personal-data fixtures. Use get_ark_task_result to read the actual status/output.",
    inputSchema: ArkAcceptanceRequest,
    outputSchema: z.object({ projectId: z.string().uuid(), requestId: z.string().uuid(), caseId: z.string(),
      objectiveId: z.string().uuid(), taskId: z.string().uuid(), status: z.string(), completed: z.boolean(), contractHash: z.string() }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async (raw, ctx) => {
    const input = ArkAcceptanceRequest.parse(raw);
    assertArkAcceptanceSubmission(ctx, input.projectId);
    const { userId, supabase } = arkMcpUserContext(ctx);
    await assertProjectOwnedByUser(supabase, userId, input.projectId);
    const contract = acceptanceContract();
    if (!contract.enabledCases.includes(input.caseId)) throw new Error("ark_acceptance_case_not_enabled");
    const key = acceptanceObjectiveKey(contract.contractHash, input.caseId);
    const objective = await new SupabaseArkStore(supabaseAdmin()).enqueueObjective({ userId, projectId: input.projectId,
      goal: `Capture unscored synthetic context comparison: ${input.caseId}`,
      idempotencyKey: key, budget: { maxTasksPerCycle: 1, maxRuntimeMs: 55000, maxAttemptsPerTask: 1 },
      tasks: [{ taskKey: "comparison", kind: ACCEPTANCE_TASK_KIND,
        description: `Run checked-in case ${input.caseId}`, idempotencyKey: key + ":comparison", maxAttempts: 1,
        payload: { caseId: input.caseId, contractHash: contract.contractHash, clientId: ctx.http!.authInfo!.clientId } }],
    });
    if (objective.userId !== userId || objective.projectId !== input.projectId) throw new Error("ark_acceptance_enqueue_scope_mismatch");
    const { data, error } = await supabase.from("ark_tasks").select("id,user_id,project_id,status")
      .eq("objective_id", objective.id).eq("task_key", "comparison").eq("user_id", userId).eq("project_id", input.projectId).maybeSingle();
    if (error) throw error;
    if (!data || data.user_id !== userId || data.project_id !== input.projectId)
      throw new Error("ark_acceptance_readback_unavailable_retry_same_request_id");
    const value = { projectId: input.projectId, requestId: input.requestId, caseId: input.caseId,
      objectiveId: objective.id, taskId: data.id, status: data.status, completed: data.status === "completed", contractHash: contract.contractHash };
    return { content: [{ type: "text" as const, text: JSON.stringify(value) }], structuredContent: value };
  });
}

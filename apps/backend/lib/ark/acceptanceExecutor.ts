import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ACCEPTANCE_TASK_KIND, acceptanceContract, acceptanceCaseInput } from "./acceptanceContract";
import type { ArkExecutorRegistry } from "./executorRegistry";
import { arkAcceptanceProjects, isArkAcceptanceSubmissionEnabled } from "../mcp/taskPermissions";
import { claimAgencyOperation, completeAgencyOperation } from "../arbor/agency/idempotency";
import { runAcceptanceComparison } from "../arbor/agency/acceptanceRunner";
import { provisionAcceptanceFixture } from "../arbor/agency/acceptanceFixture";

const Payload = z.object({ caseId: z.string(), contractHash: z.string().regex(/^[a-f0-9]{64}$/), clientId: z.string().min(1) }).strict();

export function registerArkAcceptanceExecutor(input: { registry: ArkExecutorRegistry; supabase: SupabaseClient }) {
  input.registry.register(ACCEPTANCE_TASK_KIND, async ({ claim, heartbeat }) => {
    const blocked = (message: string) => ({ status: "blocked" as const,
      blocker: { kind: "external_authority" as const, message } });
    if (!isArkAcceptanceSubmissionEnabled()) return blocked("Behavior acceptance is disabled.");
    const payload = Payload.safeParse(claim.task.payload);
    if (!payload.success) return blocked("Invalid bounded acceptance payload.");
    if (claim.task.userId !== claim.objective.userId || claim.task.projectId !== claim.objective.projectId)
      return blocked("Acceptance claim scope mismatch.");
    const contract = acceptanceContract();
    if (payload.data.contractHash !== contract.contractHash || !contract.enabledCases.includes(payload.data.caseId))
      return blocked("Reviewed acceptance contract changed or case is disabled; queued work cannot use a different contract.");
    const { data, error } = await input.supabase.auth.admin.getUserById(claim.task.userId);
    if (error || !data.user || !arkAcceptanceProjects(data.user.app_metadata, payload.data.clientId).includes(claim.task.projectId))
      return blocked("Acceptance client/project grant is absent or revoked.");
    const ownership = await input.supabase.from("projects").select("id")
      .eq("id", claim.task.projectId).eq("user_id", claim.task.userId).maybeSingle();
    if (ownership.error || !ownership.data) return blocked("Acceptance project ownership is unavailable.");
    if (!process.env.OPENAI_API_KEY) return blocked("Host model credential is unavailable.");
    const operation = await claimAgencyOperation({ supabase: input.supabase, userId: claim.task.userId,
      projectId: claim.task.projectId, key: claim.task.idempotencyKey, operation: ACCEPTANCE_TASK_KIND });
    if (!operation.acquired) {
      if (operation.result != null) return { status: "completed", result: operation.result };
      return { status: "blocked", blocker: { kind: "operation_in_progress",
        message: "Acceptance operation was already claimed; do not replay paid calls after a crash or uncertain result." } };
    }
    const deadline = Date.now() + 45000;
    const { openai } = await import("../providers/openai");
    try {
      const result = await runAcceptanceComparison({ ...acceptanceCaseInput(payload.data.caseId, contract.contractHash),
        config: contract.config, provision: provisionAcceptanceFixture,
        createResponse: async request => {
          await heartbeat();
          const remaining = deadline - Date.now();
          if (remaining <= 1000 || !isArkAcceptanceSubmissionEnabled()) throw new Error("acceptance_host_deadline_or_disabled");
          // No SDK retry can silently multiply the budget. Bound each request
          // by the remaining task deadline and renew the existing worker lease.
          return openai.responses.create(request, { timeout: Math.min(15000, remaining - 500), maxRetries: 0 });
        },
        record: async event => {
          await heartbeat();
          const captured = await input.supabase.from("ark_events").insert({ objective_id: claim.objective.id,
            task_id: claim.task.id, event_type: "behavior_acceptance_capture", payload: event });
          if (captured.error) throw new Error("acceptance_capture_failed");
        },
      });
      if (result.failures.length || result.pairs.length !== 1)
        return { status: "failed", error: "ark_acceptance_incomplete_capture_inspect_owned_events", retryable: false };
      const output = { capability: ACCEPTANCE_TASK_KIND, verified: true,
        verificationScope: "captured both arms; behavior remains unscored, durability/acoustics unverified",
        contractHash: contract.contractHash, output: result };
      await completeAgencyOperation({ supabase: input.supabase, userId: claim.task.userId,
        projectId: claim.task.projectId, key: claim.task.idempotencyKey, operation: ACCEPTANCE_TASK_KIND, result: output });
      return { status: "completed", result: output };
    } catch {
      return { status: "failed", error: "ark_acceptance_capture_failed_or_budget_exhausted_inspect_owned_events", retryable: false };
    }
  });
}

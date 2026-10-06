import { adapterFailure } from "@/lib/arbor/adapters/result";
import { decideAdapterRecovery } from "@/lib/arbor/adapters/recovery";
import type { AgencyToolExecutionDelegate } from "@/lib/arbor/agency/openaiAgent";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchAgencyToolThroughArk } from "./agencyDispatcher";
import { arkAgencyPlanId } from "./agencyPlanId";

export function buildArkAgencyExecutionDelegate(input: {
  toolSupabase: SupabaseClient;
  goal: string;
  resolvePlanId?: (input: {
    capability: string;
    arguments: Record<string, unknown>;
    turnId: string;
  }) => string | null;
  canDispatch?: (input: {
    capability: string;
    arguments: Record<string, unknown>;
    turnId: string;
  }) => { allowed: boolean; reason?: string };
  onEnqueued?: (input: {
    objectiveId: string;
    planId: string;
    capability: string;
  }) => Promise<void>;
}): AgencyToolExecutionDelegate {
  return {
    managesWriteIdempotency: true,
    async execute({ tool, args, context, attemptedRoutes }) {
      const guard = input.canDispatch?.({
        capability: tool.name,
        arguments: args,
        turnId: context.turnId,
      });
      if (guard && !guard.allowed) {
        return {
          kind: "checkpointed",
          reason:
            guard.reason ??
            "A prior durable ARK action is still unresolved; no second action will be started.",
        };
      }

      const planId =
        input.resolvePlanId?.({
          capability: tool.name,
          arguments: args,
          turnId: context.turnId,
        }) ??
        arkAgencyPlanId({
          turnId: context.turnId,
          toolName: tool.name,
          args,
        });

      const dispatchSameAction = () => dispatchAgencyToolThroughArk({
        arkSupabase: supabaseAdmin(),
        toolSupabase: input.toolSupabase,
        userId: context.userId,
        projectId: context.projectId,
        conversationId: context.conversationId,
        turnId: context.turnId,
        goal: input.goal,
        planId,
        actionId: "execute",
        capability: tool.name,
        arguments: args,
        onEnqueued: input.onEnqueued
          ? (objectiveId) =>
              input.onEnqueued!({
                objectiveId,
                planId,
                capability: tool.name,
              })
          : undefined,
      });

      const dispatched = await dispatchSameAction();

      if (dispatched.status === "completed") {
        return {
          kind: "outcome",
          outcome: {
            ok: true,
            result: dispatched.output,
            attempts: dispatched.attempts ?? 1,
            recoveredFailures: [],
          },
        };
      }

      if (
        dispatched.status === "checkpointed" ||
        (
          dispatched.status === "blocked" &&
          dispatched.blocker.kind === "operation_in_progress"
        )
      ) {
        return {
          kind: "checkpointed",
          objectiveId: dispatched.objectiveId,
          reason:
            "INTERNAL CONTINUATION REQUIRED: ARK durably owns this unfinished action. Resume the same objective automatically; do not ask the user to say go and do not treat the checkpoint as completion.",
          retry: async () => {
            const next = await dispatchSameAction();
            if (next.status === "completed") {
              return { kind: "outcome", outcome: { ok: true, result: next.output, attempts: next.attempts ?? 1, recoveredFailures: [] } };
            }
            if (next.status === "checkpointed" || (next.status === "blocked" && next.blocker.kind === "operation_in_progress")) {
              return {
                kind: "checkpointed",
                objectiveId: next.objectiveId,
                reason: "INTERNAL CONTINUATION REQUIRED: ARK still owns the unfinished action.",
                retry: async () => {
                  const final = await dispatchSameAction();
                  return final.status === "completed"
                    ? { kind: "outcome", outcome: { ok: true, result: final.output, attempts: final.attempts ?? 1, recoveredFailures: [] } }
                    : { kind: "checkpointed", objectiveId: final.objectiveId, reason: "INTERNAL CONTINUATION REQUIRED: durable ARK work remains unfinished." };
                },
              };
            }
            const error = next.status === "failed" ? next.error : "ark_execution_blocked";
            return { kind: "outcome", outcome: { ok: false, failure: adapterFailure({ kind: next.status === "blocked" ? "authorization" : "provider_failure", error, retryable: false, alternateRoutes: tool.alternateRoutes, evidence: { capability: tool.name, arkObjectiveId: next.objectiveId } }), recovery: { action: "stop", reason: error }, attempts: 1, recoveredFailures: [] } };
          },
        };
      }

      const error =
        dispatched.status === "failed"
          ? dispatched.error
          : typeof dispatched.blocker.message === "string"
            ? dispatched.blocker.message
            : "ark_execution_blocked";

      const failure = adapterFailure({
        kind:
          dispatched.status === "blocked"
            ? "authorization"
            : "provider_failure",
        error,
        retryable: false,
        alternateRoutes: tool.alternateRoutes,
        evidence: {
          capability: tool.name,
          arkObjectiveId: dispatched.objectiveId,
        },
      });

      return {
        kind: "outcome",
        outcome: {
          ok: false,
          failure,
          recovery: decideAdapterRecovery(failure, attemptedRoutes),
          attempts: 1,
          recoveredFailures: [],
        },
      };
    },
  };
}

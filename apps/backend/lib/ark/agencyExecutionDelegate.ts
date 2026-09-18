import { adapterFailure } from "@/lib/arbor/adapters/result";
import { decideAdapterRecovery } from "@/lib/arbor/adapters/recovery";
import { agencyOperationKey } from "@/lib/arbor/agency/idempotency";
import type { AgencyToolExecutionDelegate } from "@/lib/arbor/agency/openaiAgent";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchAgencyToolThroughArk } from "./agencyDispatcher";

export function buildArkAgencyExecutionDelegate(input: {
  supabase: SupabaseClient;
  goal: string;
}): AgencyToolExecutionDelegate {
  return {
    managesWriteIdempotency: true,
    async execute({ tool, args, context, attemptedRoutes }) {
      const planId = `ark:${agencyOperationKey({
        turnId: context.turnId,
        toolName: tool.name,
        args,
      })}`;

      const dispatched = await dispatchAgencyToolThroughArk({
        supabase: input.supabase,
        userId: context.userId,
        projectId: context.projectId,
        conversationId: context.conversationId,
        turnId: context.turnId,
        goal: input.goal,
        planId,
        actionId: "execute",
        capability: tool.name,
        arguments: args,
      });

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
            "The selected action is durably owned by ARK and remains unfinished. Its checkpoint is preserved for continuation.",
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

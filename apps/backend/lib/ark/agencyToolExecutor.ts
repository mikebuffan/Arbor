import type { SupabaseClient } from "@supabase/supabase-js";
import { buildArborAgencyTools } from "@/lib/arbor/agency/arborTools";
import { executeAgencyToolWithRecovery } from "@/lib/arbor/agency/toolExecution";
import { toolNeedsUserBoundary } from "@/lib/arbor/agency/tools";
import {
  claimAgencyOperation,
  completeAgencyOperation,
} from "@/lib/arbor/agency/idempotency";
import type { AgencyTool } from "@/lib/arbor/agency/tools";
import type { ArkExecutorRegistry } from "./executorRegistry";

function payloadString(
  payload: Record<string, unknown>,
  key: string,
): string {
  const value = payload[key];
  if (typeof value !== "string" || !value) {
    throw new Error(`ark_agency_tool_missing_${key}`);
  }
  return value;
}

export function registerArkAgencyToolExecutor(input: {
  registry: ArkExecutorRegistry;
  supabase: SupabaseClient;
}): void {
  input.registry.register("arbor.agency-tool", async ({ claim, heartbeat }) => {
    const capability = payloadString(claim.task.payload, "capability");
    const args = claim.task.payload.arguments;
    if (!args || typeof args !== "object" || Array.isArray(args)) {
      throw new Error("ark_agency_tool_invalid_arguments");
    }

    let tool: AgencyTool;
    try {
      tool = buildArborAgencyTools({ supabase: input.supabase }).get(capability);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith("agency_tool_unknown:")) {
        return {
          status: "blocked",
          blocker: {
            kind: "unsupported_capability",
            message: `No Arbor tool is registered for ${capability}`,
          },
        };
      }
      throw error;
    }
    if (toolNeedsUserBoundary(tool)) {
      return {
        status: "blocked",
        blocker: {
          kind: tool.risk === "irreversible"
            ? "irreversible_action"
            : "high_consequence_fork",
          message: `${capability} requires an explicit user boundary`,
        },
      };
    }

    const operationKey =
      tool.risk === "reversible_write" ? claim.task.idempotencyKey : null;

    if (operationKey) {
      const idempotency = await claimAgencyOperation({
        supabase: input.supabase,
        userId: claim.task.userId,
        projectId: claim.task.projectId,
        key: operationKey,
        operation: capability,
      });
      if (!idempotency.acquired) {
        if (idempotency.result !== null && idempotency.result !== undefined) {
          return {
            status: "completed",
            result: {
              capability,
              verified: true,
              attempts: 0,
              replayed: true,
              output: idempotency.result,
            },
          };
        }
        return {
          status: "blocked",
          blocker: {
            kind: "operation_in_progress",
            message:
              `${capability} already has an unfinished idempotent execution; ARK will not replay the side effect`,
          },
        };
      }
    }

    await heartbeat();
    const outcome = await executeAgencyToolWithRecovery({
      tool,
      args: args as Record<string, unknown>,
      context: {
        userId: claim.task.userId,
        projectId: claim.task.projectId,
        conversationId:
          typeof claim.task.payload.conversationId === "string"
            ? claim.task.payload.conversationId
            : null,
        turnId: payloadString(claim.task.payload, "turnId"),
      },
      attemptedRoutes: [],
    });

    if (!outcome.ok) {
      return {
        status: "failed",
        error: `${outcome.failure.kind}:${outcome.failure.error}`,
        retryable: outcome.failure.retryable,
      };
    }

    if (operationKey) {
      await completeAgencyOperation({
        supabase: input.supabase,
        userId: claim.task.userId,
        projectId: claim.task.projectId,
        key: operationKey,
        result: outcome.result,
      });
    }

    return {
      status: "completed",
      result: {
        capability,
        verified: true,
        attempts: outcome.attempts,
        output: outcome.result,
      },
    };
  });
}

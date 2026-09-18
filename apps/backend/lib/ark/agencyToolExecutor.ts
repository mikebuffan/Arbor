import type { SupabaseClient } from "@supabase/supabase-js";
import { buildArborAgencyTools } from "@/lib/arbor/agency/arborTools";
import { executeAgencyToolWithRecovery } from "@/lib/arbor/agency/toolExecution";
import { toolNeedsUserBoundary } from "@/lib/arbor/agency/tools";
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
      throw new Error(`ark_agency_tool_failed:${outcome.failure.kind}`);
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

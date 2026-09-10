import {
  adapterFailure,
  type ArborAdapterFailure,
  type ArborAdapterFailureKind,
} from "../adapters/result";

import {
  decideAdapterRecovery,
  type AdapterRecoveryDecision,
} from "../adapters/recovery";

import type {
  AgencyTool,
  AgencyToolContext,
} from "./tools";

export type AgencyToolExecutionOutcome =
  | {
      ok: true;
      result: unknown;
      attempts: number;
      recoveredFailures:
        ArborAdapterFailure[];
    }
  | {
      ok: false;
      failure: ArborAdapterFailure;
      recovery: AdapterRecoveryDecision;
      attempts: number;
      recoveredFailures:
        ArborAdapterFailure[];
    };

function errorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message.slice(0, 500)
    : "tool_execution_failed";
}

function classifyFailure(
  message: string,
): ArborAdapterFailureKind {
  if (
    message.startsWith(
      "agency_tool_invalid",
    )
  ) {
    return "invalid_input";
  }

  if (
    /(?:not[_ -]?found|does not exist)/i.test(
      message,
    )
  ) {
    return "not_found";
  }

  if (
    /(?:unauthoriz|forbidden|permission denied|missing authority)/i.test(
      message,
    )
  ) {
    return "authorization";
  }

  if (
    /(?:timeout|timed out|temporar|econnreset|network|fetch failed)/i.test(
      message,
    )
  ) {
    return "transient";
  }

  return "provider_failure";
}

function mayRetryRead(
  tool: AgencyTool,
  kind: ArborAdapterFailureKind,
  attempt: number,
): boolean {
  if (attempt >= 2) {
    return false;
  }

  if (tool.risk !== "read") {
    return false;
  }

  return (
    kind === "transient" ||
    kind === "provider_failure"
  );
}

export async function executeAgencyToolWithRecovery(
  input: {
    tool: AgencyTool;
    args: Record<string, unknown>;
    context: AgencyToolContext;
    attemptedRoutes: string[];
  },
): Promise<AgencyToolExecutionOutcome> {
  const recoveredFailures:
    ArborAdapterFailure[] = [];

  for (
    let attempt = 1;
    attempt <= 2;
    attempt += 1
  ) {
    try {
      const result =
        await input.tool.execute(
          input.args,
          input.context,
        );

      return {
        ok: true,
        result,
        attempts: attempt,
        recoveredFailures,
      };
    } catch (error) {
      const message =
        errorMessage(error);

      const kind =
        classifyFailure(message);

      const failure =
        adapterFailure({
          kind,
          error: message,
          retryable:
            mayRetryRead(
              input.tool,
              kind,
              attempt,
            ),
          alternateRoutes:
            input.tool.alternateRoutes,
          evidence: {
            capability:
              input.tool.name,
            attempt,
          },
        });

      const recovery =
        decideAdapterRecovery(
          failure,
          input.attemptedRoutes,
        );

      if (
        recovery.kind === "retry" &&
        attempt < 2
      ) {
        recoveredFailures.push(
          failure,
        );
        continue;
      }

      return {
        ok: false,
        failure,
        recovery,
        attempts: attempt,
        recoveredFailures,
      };
    }
  }

  throw new Error(
    "agency_tool_recovery_unreachable",
  );
}

export function recoveryInstruction(
  recovery: AdapterRecoveryDecision,
): string {
  if (recovery.kind === "alternate") {
    return [
      "Use the named alternate capability next:",
      recovery.route,
      "Choose arguments appropriate to that capability.",
      "Do not blindly replay incompatible arguments.",
    ].join(" ");
  }

  if (recovery.kind === "retry") {
    return [
      "Retry this capability only through the",
      "bounded recovery policy.",
    ].join(" ");
  }

  return [
    "Do not automatically retry this capability.",
    "Choose another valid reversible route if one exists.",
    "Otherwise preserve the real blocker instead of pretending",
    "the action succeeded.",
  ].join(" ");
}

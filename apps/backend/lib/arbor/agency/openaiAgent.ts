import { openai } from "@/lib/providers/openai";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";
import type {
  AgencyToolContext,
} from "./tools";

import {
  AgencyToolRegistry,
  toolNeedsUserBoundary,
} from "./tools";

import {
  executeAgencyToolWithRecovery,
  recoveryInstruction,
} from "./toolExecution";

import {
  verifyAgencyCompletion,
} from "./verifier";

export type AgencyMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AgencyLoopHooks = {
  onRoundStart?: (
    round: number,
  ) => Promise<void>;

  onToolSelected?: (
    input: {
      round: number;
      name: string;
      arguments:
        Record<string, unknown>;
    },
  ) => Promise<void>;

  onToolResult?: (
    input: {
      round: number;
      name: string;
      result: unknown;
    },
  ) => Promise<void>;

  onToolError?: (
    input: {
      round: number;
      name: string;
      error: string;
    },
  ) => Promise<void>;

  onBoundary?: (
    input: {
      round: number;
      name: string;
      reason:
        | "irreversible_action"
        | "high_consequence_fork";
      arguments:
        Record<string, unknown>;
    },
  ) => Promise<void>;

  onVerification?: (
    input: {
      round: number;
      complete: boolean;
      score: number;
      unresolvedWork: string[];
      evidence: string[];
      strategyCorrection:
        string | null;
      behaviorViolations: string[];
    },
  ) => Promise<void>;

  onComplete?: (
    input: {
      rounds: number;
      toolCalls: number;
      text: string;
    },
  ) => Promise<void>;
};

type FunctionCall = {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: string;
};

const AGENCY_MODEL_MAX_ATTEMPTS = 3;
const AGENCY_MODEL_RETRY_BASE_MS = 1_000;
const AGENCY_MODEL_RETRY_MAX_MS = 10_000;

function providerStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

function providerFailureCode(error: unknown): string {
  const status = providerStatus(error);
  if (status === 429) return "provider_rate_limited";
  if (status === 408) return "provider_timeout";
  if (status !== null && status >= 500) return "provider_unavailable";
  return "provider_network_error";
}

function isRetryableProviderFailure(error: unknown): boolean {
  const status = providerStatus(error);
  if (status === 408 || status === 429 || (status !== null && status >= 500)) {
    return true;
  }
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: unknown }).name;
  return (
    name === "APIConnectionError" ||
    name === "APIConnectionTimeoutError" ||
    name === "APITimeoutError"
  );
}

function retryAfterMs(error: unknown, attempt: number): number {
  let retryAfter: string | null = null;
  if (error && typeof error === "object") {
    const headers = (error as { headers?: unknown }).headers;
    if (headers && typeof headers === "object" && "get" in headers) {
      const get = (headers as { get?: unknown }).get;
      if (typeof get === "function") {
        retryAfter = get.call(headers, "retry-after");
      }
    }
  }
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(Math.ceil(seconds * 1_000), AGENCY_MODEL_RETRY_MAX_MS);
  }
  return Math.min(
    AGENCY_MODEL_RETRY_BASE_MS * 2 ** (attempt - 1),
    AGENCY_MODEL_RETRY_MAX_MS,
  );
}

async function createAgencyModelResponse(
  request: ResponseCreateParamsNonStreaming,
): Promise<Response> {
  for (let attempt = 1; attempt <= AGENCY_MODEL_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await openai.responses.create(request);
    } catch (error) {
      const willRetry =
        attempt < AGENCY_MODEL_MAX_ATTEMPTS &&
        isRetryableProviderFailure(error);
      if (!willRetry) throw error;

      const delayMs = retryAfterMs(error, attempt);
      console.warn("[agency] model request retrying", {
        subsystem: "chat",
        operation: "model_agency",
        code: providerFailureCode(error),
        attempt,
        maxAttempts: AGENCY_MODEL_MAX_ATTEMPTS,
        nextDelayMs: delayMs,
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("agency_model_attempts_exhausted");
}

export type AgentResult =
  | {
      status: "complete";
      text: string;
      responseId: string;
      toolCalls: number;
    }
  | {
      status: "blocked";
      reason:
        | "irreversible_action"
        | "high_consequence_fork";
      toolName: string;
      arguments:
        Record<string, unknown>;
      responseId: string;
      toolCalls: number;
    };

function parseArguments(
  raw: string,
): Record<string, unknown> {
  const parsed = JSON.parse(raw);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "agency_tool_arguments_invalid",
    );
  }

  return parsed as Record<
    string,
    unknown
  >;
}

function functionCalls(
  output: unknown[],
): FunctionCall[] {
  return output.filter(
    (
      item,
    ): item is FunctionCall =>
      Boolean(
        item &&
          typeof item === "object" &&
          (
            item as {
              type?: string;
            }
          ).type ===
            "function_call",
      ),
  );
}

function requestTools(
  tools:
    Array<Record<string, unknown>>,
): {
  tools?: any;
  tool_choice?: "auto";
} {
  if (!tools.length) {
    return {};
  }

  return {
    tools: tools as any,
    tool_choice: "auto",
  };
}

function latestUserGoal(
  input: {
    goal?: string;
    userText?: string;
    messages?: AgencyMessage[];
  },
): string {
  return (
    input.goal?.trim() ||
    input.userText?.trim() ||
    [...(input.messages ?? [])]
      .reverse()
      .find(
        (message) =>
          message.role === "user",
      )
      ?.content.trim() ||
    ""
  );
}

export async function runOpenAIAgencyAgent(
  input: {
    instructions: string;
    goal?: string;
    userText?: string;
    messages?: AgencyMessage[];
    tools: AgencyToolRegistry;
    context: AgencyToolContext;
    allowWebResearch?: boolean;
    verifyCompletion?: boolean;
    behaviorRequirements?: string[];
    priorActionEvidence?: string[];
    maxRounds?: number;
    hooks?: AgencyLoopHooks;
  },
): Promise<AgentResult> {
  const maxRounds =
    input.maxRounds ?? 16;

  let toolCalls = 0;

  // Durable-in-run evidence for the completion verifier. This lets Arbor
  // prove that an action happened without forcing the final user-facing text
  // to narrate every tool call just to satisfy verification.
  const actionEvidence: string[] = Array.from(
    new Set(
      (input.priorActionEvidence ?? [])
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(-40);

  const attemptedRoutes =
    new Set<string>();

  const firstInput =
    input.messages?.length
      ? input.messages
      : input.userText
        ? input.userText
        : "";

  if (
    (
      typeof firstInput ===
        "string" &&
      !firstInput.trim()
    ) ||
    (
      Array.isArray(firstInput) &&
      !firstInput.length
    )
  ) {
    throw new Error(
      "agency_input_required",
    );
  }

  const goal =
    latestUserGoal(input);

  if (!goal) {
    throw new Error(
      "agency_goal_required",
    );
  }

  const shouldVerify =
    input.verifyCompletion ??
    process.env
      .ARBOR_AGENCY_VERIFY_COMPLETION !==
      "false";

  const tools:
    Array<Record<string, unknown>> = [
      ...(
        input.allowWebResearch
          ? [
              {
                type: "web_search",
              },
            ]
          : []
      ),
      ...input.tools
        .openAIToolDefinitions(),
    ];

  const toolFields =
    requestTools(tools);

  let response =
    await createAgencyModelResponse({
      model:
        process.env
          .OPENAI_AGENCY_MODEL ??
        process.env.OPENAI_MODEL ??
        "gpt-5",
      instructions:
        input.instructions,
      input: firstInput as any,
      ...toolFields,
    });

  for (
    let round = 0;
    round < maxRounds;
    round += 1
  ) {
    await input.hooks
      ?.onRoundStart?.(round);

    const calls =
      functionCalls(
        response.output as unknown[],
      );

    if (!calls.length) {
      const text =
        response.output_text
          ?.trim() ?? "";

      if (!shouldVerify) {
        await input.hooks
          ?.onComplete?.({
            rounds: round + 1,
            toolCalls,
            text,
          });

        return {
          status: "complete",
          text,
          responseId:
            response.id,
          toolCalls,
        };
      }

      const verification =
        await verifyAgencyCompletion(
          {
            goal,
            candidateText:
              text,
            behaviorRequirements:
              input.behaviorRequirements,
            actionEvidence,
          },
        );

      await input.hooks
        ?.onVerification?.({
          round,
          ...verification,
        });

      const behaviorClean =
        verification
          .behaviorViolations
          .length === 0;

      if (
        verification.complete &&
        behaviorClean
      ) {
        await input.hooks
          ?.onComplete?.({
            rounds: round + 1,
            toolCalls,
            text,
          });

        return {
          status: "complete",
          text,
          responseId:
            response.id,
          toolCalls,
        };
      }

      response =
        await createAgencyModelResponse(
          {
            model:
              process.env
                .OPENAI_AGENCY_MODEL ??
              process.env
                .OPENAI_MODEL ??
              "gpt-5",
            instructions:
              input.instructions,
            previous_response_id:
              response.id,
            input: [
              verification.complete
                ? "INTERNAL BEHAVIOR CHECK: the candidate completed the goal but violated protected Arbor behavior."
                : "INTERNAL COMPLETION CHECK: the goal is not complete.",
              !verification.complete
                ? `Unresolved work: ${
                    verification
                      .unresolvedWork
                      .join("; ") ||
                    "unspecified"
                  }`
                : "",
              verification
                .behaviorViolations
                .length
                ? `Behavior violations: ${verification.behaviorViolations.join("; ")}`
                : "",
              verification
                .strategyCorrection
                ? `Strategy correction: ${verification.strategyCorrection}`
                : "",
              "Continue the work now. Use available tools/research when useful.",
              "Produce a corrected candidate that satisfies the goal without repeating any reported behavior violation.",
              "Do not merely report what remains if it can be completed with an available reversible action.",
            ]
              .filter(Boolean)
              .join("\n"),
            ...toolFields,
          },
        );

      continue;
    }

    const outputs:
      Array<{
        type:
          "function_call_output";
        call_id: string;
        output: string;
      }> = [];

    for (const call of calls) {
      const tool =
        input.tools.get(
          call.name,
        );

      const args =
        parseArguments(
          call.arguments,
        );

      attemptedRoutes.add(
        tool.name,
      );

      await input.hooks
        ?.onToolSelected?.({
          round,
          name: tool.name,
          arguments: args,
        });

      if (
        toolNeedsUserBoundary(
          tool,
        )
      ) {
        const reason:
          | "irreversible_action"
          | "high_consequence_fork" =
          tool.risk === "irreversible"
            ? "irreversible_action"
            : "high_consequence_fork";

        await input.hooks
          ?.onBoundary?.({
            round,
            name: tool.name,
            reason,
            arguments: args,
          });

        return {
          status: "blocked",
          reason,
          toolName:
            tool.name,
          arguments: args,
          responseId:
            response.id,
          toolCalls,
        };
      }

      const execution =
        await executeAgencyToolWithRecovery(
          {
            tool,
            args,
            context:
              input.context,
            attemptedRoutes:
              [
                ...attemptedRoutes,
              ],
          },
        );

      toolCalls +=
        execution.attempts;

      if (execution.ok) {
        await input.hooks
          ?.onToolResult?.({
            round,
            name:
              tool.name,
            result:
              execution.result,
          });

        actionEvidence.push(
          `capability ${tool.name} completed successfully`,
        );

        outputs.push({
          type:
            "function_call_output",
          call_id:
            call.call_id,
          output:
            JSON.stringify({
              ok: true,
              result:
                execution.result,
              attempts:
                execution.attempts,
              recovered:
                execution
                  .recoveredFailures
                  .length > 0,
            }),
        });

        continue;
      }

      await input.hooks
        ?.onToolError?.({
          round,
          name: tool.name,
          error:
            execution.failure.error,
        });

      actionEvidence.push(
        `capability ${tool.name} failed: ${execution.failure.kind}`,
      );

      outputs.push({
        type:
          "function_call_output",
        call_id:
          call.call_id,
        output:
          JSON.stringify({
            ok: false,
            error:
              execution.failure.error,
            kind:
              execution.failure.kind,
            retryable:
              execution.failure
                .retryable,
            attempts:
              execution.attempts,
            recovery:
              execution.recovery,
            instruction:
              recoveryInstruction(
                execution.recovery,
              ),
          }),
      });
    }

    response =
      await createAgencyModelResponse(
        {
          model:
            process.env
              .OPENAI_AGENCY_MODEL ??
            process.env
              .OPENAI_MODEL ??
            "gpt-5",
          instructions:
            input.instructions,
          previous_response_id:
            response.id,
          input:
            outputs as any,
          ...toolFields,
        },
      );
  }

  throw new Error(
    `agency_round_budget_exhausted:${maxRounds}`,
  );
}

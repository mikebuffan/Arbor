import { openai } from "@/lib/providers/openai";
import type { AgencyResponseCreate } from "./responseTransport";
import type {
  AgencyToolContext,
} from "./tools";
import { agencyOperationKey } from "./idempotency";

import {
  AgencyToolRegistry,
  toolNeedsUserBoundary,
} from "./tools";

import {
  executeAgencyToolWithRecovery,
  recoveryInstruction,
  type AgencyToolExecutionOutcome,
} from "./toolExecution";

import {
  verifyAgencyCompletion,
} from "./verifier";

export type AgencyMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AgencyToolExecutionDelegateResult =
  | {
      kind: "outcome";
      outcome: AgencyToolExecutionOutcome;
    }
  | {
      kind: "checkpointed";
      reason: string;
      objectiveId?: string;
      retry?: () => Promise<AgencyToolExecutionDelegateResult>;
    };

export type AgencyToolExecutionDelegate = {
  managesWriteIdempotency?: boolean;
  execute(input: {
    tool: ReturnType<AgencyToolRegistry["get"]>;
    args: Record<string, unknown>;
    context: AgencyToolContext;
    attemptedRoutes: string[];
  }): Promise<AgencyToolExecutionDelegateResult>;
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
      // Trusted tool names only: no untrusted argument payload or automatic replay.
      completedBeforeBoundary: string[];
      deferredToolNames: string[];
    },
  ) => Promise<void>;

  onVerification?: (
    input: {
      round: number;
      // Transport response identity supplied by the trusted verifier caller.
      verificationId: string;
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

export type AgentResult =
  | {
      status: "complete";
      text: string;
      responseId: string;
      toolCalls: number;
    }
  | {
      status: "checkpointed";
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
    responseCreate?: AgencyResponseCreate;
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
    idempotency?: {
      claim(input: { key: string; operation: string }): Promise<
        | { acquired: true; result: null }
        | { acquired: false; result: unknown }
      >;
      complete(input: { key: string; operation: string; result: unknown }): Promise<void>;
    };
    executionDelegate?: AgencyToolExecutionDelegate;
  },
): Promise<AgentResult> {
  const createResponse: AgencyResponseCreate = input.responseCreate ??
    ((request) => openai.responses.create(request));
  const maxRounds =
    input.maxRounds ?? 48;

  // User-controlled or host-provided execution budgets are never authority
  // to spin forever. Validate before the first provider request or tool call.
  if (!Number.isSafeInteger(maxRounds) || maxRounds < 1 || maxRounds > 128)
    throw new Error("agency_invalid_round_budget");

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
    await createResponse({
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

    // Provider output is not a completed action merely because text or a
    // tool call was present. An explicitly unfinished/failed provider response
    // and a malformed output container are checkpoints, never final answers.
    if ((response.status && response.status !== "completed") ||
      !Array.isArray(response.output)) {
      return {
        status: "checkpointed",
        text: "INTERNAL CONTINUATION REQUIRED: provider response incomplete or invalid; reconcile the response before resuming.",
        responseId: response.id,
        toolCalls,
      };
    }

    const calls =
      functionCalls(
        response.output as unknown[],
      );

    // Check every proposed tool before executing the first one. Otherwise a
    // malformed later call could leave an earlier write half-committed.
    const prepared: Array<{
      call: FunctionCall;
      tool: ReturnType<AgencyToolRegistry["get"]>;
      args: Record<string, unknown>;
    }> = [];
    const seenCallIds = new Set<string>();
    if (calls.length > 24) {
      return {
        status: "checkpointed",
        text: "INTERNAL CONTINUATION REQUIRED: provider requested too many tool calls.",
        responseId: response.id,
        toolCalls,
      };
    }
    try {
      for (const call of calls) {
        if (typeof call.call_id !== "string" ||
          !call.call_id.trim() || call.call_id.length > 200 ||
          seenCallIds.has(call.call_id) ||
          typeof call.name !== "string" || !call.name.trim() ||
          typeof call.arguments !== "string" ||
          call.arguments.length > 20000) {
          throw new Error("agency_invalid_provider_tool_call");
        }
        seenCallIds.add(call.call_id);
        const tool = input.tools.get(call.name);
        const args = parseArguments(call.arguments);
        prepared.push({ call, tool, args });
      }
    } catch {
      return {
        status: "checkpointed",
        text: "INTERNAL CONTINUATION REQUIRED: invalid provider tool calls; no actions dispatched.",
        responseId: response.id,
        toolCalls,
      };
    }

    if (!calls.length) {
      const text =
        response.output_text
          ?.trim() ?? "";

      // Do not treat a completed empty response as a completed user turn.
      if (!text) {
        return {
          status: "checkpointed",
          text: "INTERNAL CONTINUATION REQUIRED: no usable assistant response was returned.",
          responseId: response.id,
          toolCalls,
        };
      }

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
            responseCreate: input.responseCreate,
          },
        );

      await input.hooks
        ?.onVerification?.({
          round,
          verificationId: typeof response.id === "string" ? response.id : "",
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
        await createResponse(
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
    const completedBeforeBoundary: string[] = [];
    const dispatchedCallIds = new Set<string>();

    // When a batch includes a protected action, keep its human boundary.
    // Before returning for approval, finish only earlier safe calls and
    // later safe calls explicitly certified *independent* by trusted registry
    // metadata. Never infer independence from a model's call order or prose.
    // A selected protected operation is still returned as blocked, not done.
    const protectedIndex = prepared.findIndex(({ tool }) =>
      toolNeedsUserBoundary(tool),
    );
    const executionOrder = protectedIndex < 0
      ? prepared
      : [
          ...prepared.slice(0, protectedIndex),
          ...prepared.slice(protectedIndex + 1).filter(({ tool }) =>
            !toolNeedsUserBoundary(tool) &&
            tool.mayRunBeforeProtectedBoundary === true,
          ),
          prepared[protectedIndex]!,
        ];

    for (const { call, tool, args } of executionOrder) {
      dispatchedCallIds.add(call.call_id);

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
            completedBeforeBoundary: [...completedBeforeBoundary],
            // These were validated as tool calls but never dispatched.
            // Reassess them later; their arguments are NOT persisted/replayed.
            deferredToolNames: prepared
              .filter(({ call: proposal }) => !dispatchedCallIds.has(proposal.call_id))
              .map(({ tool: proposed }) => proposed.name),
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

      const idempotencyKey =
        tool.risk === "reversible_write" &&
        input.idempotency &&
        !input.executionDelegate?.managesWriteIdempotency
          ? agencyOperationKey({
              turnId: input.context.turnId,
              toolName: tool.name,
              args,
            })
          : null;

      if (idempotencyKey && input.idempotency) {
        const claim = await input.idempotency.claim({
          key: idempotencyKey,
          operation: tool.name,
        });

        if (!claim.acquired) {
          if (claim.result !== null && claim.result !== undefined) {
            await input.hooks?.onToolResult?.({
              round,
              name: tool.name,
              result: claim.result,
            });
            completedBeforeBoundary.push(tool.name);
            actionEvidence.push(
              `capability ${tool.name} completed successfully (idempotent replay)`,
            );
            outputs.push({
              type: "function_call_output",
              call_id: call.call_id,
              output: JSON.stringify({
                ok: true,
                result: claim.result,
                replayed: true,
                attempts: 0,
              }),
            });
          } else {
            // Another execution owns this write, but no saved result proves
            // its outcome yet. Keep this as a runtime boundary: a provider's
            // next answer (or completion score) cannot resolve an uncertain
            // side effect. The host retains the selected unfinished action;
            // resume with the same identity after its owner reconciles it.
            return {
              status: "checkpointed",
              text: "INTERNAL CONTINUATION REQUIRED: operation_in_progress; no saved action result. Do not repeat this side effect; reconcile the owning execution before resuming.",
              responseId: response.id,
              toolCalls,
            };
          }
          continue;
        }
      }

      let delegatedExecution =
        input.executionDelegate
          ? await input.executionDelegate.execute({
              tool,
              args,
              context: input.context,
              attemptedRoutes: [...attemptedRoutes],
            })
          : {
              kind: "outcome" as const,
              outcome: await executeAgencyToolWithRecovery({
                tool,
                args,
                context: input.context,
                attemptedRoutes: [...attemptedRoutes],
              }),
            };

      for (let resume = 0; delegatedExecution.kind === "checkpointed" && delegatedExecution.retry && resume < 2; resume += 1) {
        delegatedExecution = await delegatedExecution.retry();
      }

      if (delegatedExecution.kind === "checkpointed") {
        return {
          status: "checkpointed",
          text: delegatedExecution.reason,
          responseId: response.id,
          toolCalls,
        };
      }

      const execution = delegatedExecution.outcome;

      toolCalls +=
        execution.attempts;

      if (execution.ok) {
        if (idempotencyKey && input.idempotency) {
          await input.idempotency.complete({
            key: idempotencyKey,
            operation: tool.name,
            result: execution.result,
          });
        }

        await input.hooks
          ?.onToolResult?.({
            round,
            name:
              tool.name,
            result:
              execution.result,
          });
        completedBeforeBoundary.push(tool.name);

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
      await createResponse(
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

  return {
    status: "checkpointed",
    text:
      "INTERNAL CONTINUATION REQUIRED: the active objective reached an execution checkpoint and remains unfinished. Persist this checkpoint and resume automatically; do not present this text to the user as a completed turn and do not require another user prompt.",
    responseId: response.id,
    toolCalls,
  };
}

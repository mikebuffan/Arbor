import { openai } from "@/lib/providers/openai";
import type { AgencyToolContext } from "./tools";
import {
  AgencyToolRegistry,
  toolNeedsUserBoundary,
} from "./tools";
import { verifyAgencyCompletion } from "./verifier";

export type AgencyMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AgencyLoopHooks = {
  onRoundStart?: (round: number) => Promise<void>;
  onToolSelected?: (input: {
    round: number;
    name: string;
    arguments: Record<string, unknown>;
  }) => Promise<void>;
  onToolResult?: (input: {
    round: number;
    name: string;
    result: unknown;
  }) => Promise<void>;
  onToolError?: (input: {
    round: number;
    name: string;
    error: string;
  }) => Promise<void>;
  onBoundary?: (input: {
    round: number;
    name: string;
    reason: "irreversible_action" | "high_consequence_fork";
    arguments: Record<string, unknown>;
  }) => Promise<void>;
  onVerification?: (input: {
    round: number;
    complete: boolean;
    score: number;
    unresolvedWork: string[];
    evidence: string[];
    strategyCorrection: string | null;
  }) => Promise<void>;
  onComplete?: (input: {
    rounds: number;
    toolCalls: number;
    text: string;
  }) => Promise<void>;
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
      status: "blocked";
      reason: "irreversible_action" | "high_consequence_fork";
      toolName: string;
      arguments: Record<string, unknown>;
      responseId: string;
      toolCalls: number;
    };

function parseArguments(raw: string): Record<string, unknown> {
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("agency_tool_arguments_invalid");
  }

  return parsed as Record<string, unknown>;
}

function functionCalls(output: unknown[]): FunctionCall[] {
  return output.filter(
    (item): item is FunctionCall =>
      Boolean(
        item &&
          typeof item === "object" &&
          (item as { type?: string }).type === "function_call",
      ),
  );
}

function requestTools(
  tools: Array<Record<string, unknown>>,
): {
  tools?: any;
  tool_choice?: "auto";
} {
  if (!tools.length) return {};

  return {
    tools: tools as any,
    tool_choice: "auto",
  };
}

function latestUserGoal(input: {
  goal?: string;
  userText?: string;
  messages?: AgencyMessage[];
}): string {
  return (
    input.goal?.trim() ||
    input.userText?.trim() ||
    [...(input.messages ?? [])]
      .reverse()
      .find((message) => message.role === "user")
      ?.content.trim() ||
    ""
  );
}

export async function runOpenAIAgencyAgent(input: {
  instructions: string;
  goal?: string;
  userText?: string;
  messages?: AgencyMessage[];
  tools: AgencyToolRegistry;
  context: AgencyToolContext;
  allowWebResearch?: boolean;
  verifyCompletion?: boolean;
  maxRounds?: number;
  hooks?: AgencyLoopHooks;
}): Promise<AgentResult> {
  const maxRounds = input.maxRounds ?? 16;
  let toolCalls = 0;

  const firstInput = input.messages?.length
    ? input.messages
    : input.userText
      ? input.userText
      : "";

  if (
    (typeof firstInput === "string" && !firstInput.trim()) ||
    (Array.isArray(firstInput) && !firstInput.length)
  ) {
    throw new Error("agency_input_required");
  }

  const goal = latestUserGoal(input);
  if (!goal) throw new Error("agency_goal_required");

  const shouldVerify =
    input.verifyCompletion ??
    process.env.ARBOR_AGENCY_VERIFY_COMPLETION !== "false";

  const tools: Array<Record<string, unknown>> = [
    ...(input.allowWebResearch ? [{ type: "web_search" }] : []),
    ...input.tools.openAIToolDefinitions(),
  ];

  const toolFields = requestTools(tools);

  let response = await openai.responses.create({
    model:
      process.env.OPENAI_AGENCY_MODEL ??
      process.env.OPENAI_MODEL ??
      "gpt-5",
    instructions: input.instructions,
    input: firstInput as any,
    ...toolFields,
  });

  for (let round = 0; round < maxRounds; round += 1) {
    await input.hooks?.onRoundStart?.(round);

    const calls = functionCalls(response.output as unknown[]);

    if (!calls.length) {
      const text = response.output_text?.trim() ?? "";

      if (!shouldVerify) {
        await input.hooks?.onComplete?.({
          rounds: round + 1,
          toolCalls,
          text,
        });

        return {
          status: "complete",
          text,
          responseId: response.id,
          toolCalls,
        };
      }

      const verification = await verifyAgencyCompletion({
        goal,
        candidateText: text,
      });

      await input.hooks?.onVerification?.({
        round,
        ...verification,
      });

      if (verification.complete) {
        await input.hooks?.onComplete?.({
          rounds: round + 1,
          toolCalls,
          text,
        });

        return {
          status: "complete",
          text,
          responseId: response.id,
          toolCalls,
        };
      }

      response = await openai.responses.create({
        model:
          process.env.OPENAI_AGENCY_MODEL ??
          process.env.OPENAI_MODEL ??
          "gpt-5",
        instructions: input.instructions,
        previous_response_id: response.id,
        input: [
          "INTERNAL COMPLETION CHECK: the goal is not complete.",
          `Unresolved work: ${
            verification.unresolvedWork.join("; ") || "unspecified"
          }`,
          verification.strategyCorrection
            ? `Strategy correction: ${verification.strategyCorrection}`
            : "",
          "Continue the work now. Use available tools/research when useful.",
          "Do not merely report what remains if it can be completed with an available reversible action.",
        ]
          .filter(Boolean)
          .join("\n"),
        ...toolFields,
      });

      continue;
    }

    const outputs: Array<{
      type: "function_call_output";
      call_id: string;
      output: string;
    }> = [];

    for (const call of calls) {
      const tool = input.tools.get(call.name);
      const args = parseArguments(call.arguments);

      await input.hooks?.onToolSelected?.({
        round,
        name: tool.name,
        arguments: args,
      });

      if (toolNeedsUserBoundary(tool)) {
        const reason =
          tool.risk === "irreversible"
            ? ("irreversible_action" as const)
            : ("high_consequence_fork" as const);

        await input.hooks?.onBoundary?.({
          round,
          name: tool.name,
          reason,
          arguments: args,
        });

        return {
          status: "blocked",
          reason,
          toolName: tool.name,
          arguments: args,
          responseId: response.id,
          toolCalls,
        };
      }

      try {
        const result = await tool.execute(args, input.context);
        toolCalls += 1;

        await input.hooks?.onToolResult?.({
          round,
          name: tool.name,
          result,
        });

        outputs.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify({ ok: true, result }),
        });
      } catch (error) {
        toolCalls += 1;

        const message =
          error instanceof Error
            ? error.message.slice(0, 500)
            : "tool_execution_failed";

        await input.hooks?.onToolError?.({
          round,
          name: tool.name,
          error: message,
        });

        outputs.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify({
            ok: false,
            error: message,
            instruction:
              "Inspect the failure and choose another valid reversible route if one exists.",
          }),
        });
      }
    }

    response = await openai.responses.create({
      model:
        process.env.OPENAI_AGENCY_MODEL ??
        process.env.OPENAI_MODEL ??
        "gpt-5",
      instructions: input.instructions,
      previous_response_id: response.id,
      input: outputs as any,
      ...toolFields,
    });
  }

  throw new Error(`agency_round_budget_exhausted:${maxRounds}`);
}

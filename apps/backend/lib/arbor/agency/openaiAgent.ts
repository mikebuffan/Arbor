import { openai } from "@/lib/providers/openai";
import type { AgencyToolContext } from "./tools";
import {
  AgencyToolRegistry,
  toolNeedsUserBoundary,
} from "./tools";

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
  onBoundary?: (input: {
    round: number;
    name: string;
    reason: "irreversible_action" | "high_consequence_fork";
    arguments: Record<string, unknown>;
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

export async function runOpenAIAgencyAgent(input: {
  instructions: string;
  userText?: string;
  messages?: AgencyMessage[];
  tools: AgencyToolRegistry;
  context: AgencyToolContext;
  allowWebResearch?: boolean;
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
            ? "irreversible_action" as const
            : "high_consequence_fork" as const;

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

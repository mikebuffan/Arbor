import OpenAI from "openai";

import {
  ArborCapabilityRegistry,
  requiresUserBoundary,
  type CapabilityContext,
  type CapabilityRisk,
} from "./capabilities.js";
import { observeStrategy } from "./selfUpdate.js";
import type {
  ArborConversationMessage,
  ArborState,
} from "./types.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type AgencyHooks = {
  onRoundStart?: (input: {
    round: number;
  }) => Promise<void>;
  onCapabilityStart?: (input: {
    round: number;
    capability: string;
    risk: CapabilityRisk;
  }) => Promise<void>;
  onCapabilityResult?: (input: {
    round: number;
    capability: string;
    risk: CapabilityRisk;
  }) => Promise<void>;
  onBoundary?: (input: {
    round: number;
    capability: string;
    risk: CapabilityRisk;
    blocker:
      | "irreversible_action"
      | "high_consequence_fork";
  }) => Promise<void>;
  onVerification?: (input: {
    round: number;
    complete: boolean;
    unresolvedCount: number;
    strategyCandidate: string | null;
    toolCalls: number;
    researchCalls: number;
  }) => Promise<void>;
};

export type AgencyResult =
  | {
      status: "complete";
      text: string;
      state: ArborState;
      rounds: number;
      toolCalls: number;
      researchCalls: number;
    }
  | {
      status: "blocked";
      text: string;
      state: ArborState;
      rounds: number;
      toolCalls: number;
      researchCalls: number;
      blocker:
        | "irreversible_action"
        | "high_consequence_fork";
      capability: string;
    };

type CompletionVerification = {
  complete: boolean;
  unresolvedWork: string[];
  strategyCorrection: string | null;
};

type FunctionCall = {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: string;
};

export async function runAgency(input: {
  instructions: string;
  userText: string;
  history?: ArborConversationMessage[];
  state: ArborState;
  capabilities?: ArborCapabilityRegistry;
  context: Omit<CapabilityContext, "state">;
  maxRounds?: number;
  hooks?: AgencyHooks;
}): Promise<AgencyResult> {
  const maxRounds = input.maxRounds ?? 12;
  const capabilities =
    input.capabilities ?? new ArborCapabilityRegistry();

  let state = input.state;
  let pendingStrategy: string | null = null;
  let strategyAppliesFromRound: number | null = null;
  let toolCalls = 0;
  let researchCalls = 0;

  const tools: Array<Record<string, unknown>> = [
    ...(process.env.ARBOR_ENABLE_WEB_RESEARCH === "false"
      ? []
      : [{ type: "web_search" }]),
    ...capabilities.openAITools(),
  ];

  const model = process.env.ARBOR_MODEL ?? "gpt-5.6";
  const goal = state.goal ?? input.userText;
  const firstInput = [
    ...(input.history ?? []),
    {
      role: "user" as const,
      content: input.userText,
    },
  ];

  let response = await openai.responses.create({
    model,
    instructions: input.instructions,
    input: firstInput as any,
    ...(tools.length
      ? {
          tools: tools as any,
          tool_choice: "auto" as const,
        }
      : {}),
  });

  for (let round = 0; round < maxRounds; round += 1) {
    await input.hooks?.onRoundStart?.({ round });

    researchCalls += countWebSearchCalls(
      response.output as unknown[],
    );

    const calls = functionCalls(
      response.output as unknown[],
    );

    if (calls.length) {
      const outputs: Array<{
        type: "function_call_output";
        call_id: string;
        output: string;
      }> = [];

      for (const call of calls) {
        const capability = capabilities.get(call.name);
        const args = parseArguments(call.arguments);

        await input.hooks?.onCapabilityStart?.({
          round,
          capability: capability.name,
          risk: capability.risk,
        });

        if (requiresUserBoundary(capability)) {
          const blocker =
            capability.risk === "irreversible"
              ? ("irreversible_action" as const)
              : ("high_consequence_fork" as const);

          state = {
            ...state,
            unresolvedWork: [
              `requires user boundary: ${capability.name}`,
            ],
          };

          await input.hooks?.onBoundary?.({
            round,
            capability: capability.name,
            risk: capability.risk,
            blocker,
          });

          return {
            status: "blocked",
            text:
              blocker === "irreversible_action"
                ? "I need your approval before I take that irreversible action."
                : "I need your decision before I take that high-consequence action.",
            state,
            rounds: round + 1,
            toolCalls,
            researchCalls,
            blocker,
            capability: capability.name,
          };
        }

        const execution = await capability.execute(
          args,
          {
            ...input.context,
            state,
          },
        );

        if (execution.statePatch) {
          state = {
            ...state,
            ...execution.statePatch,
          };
        }

        toolCalls += 1;

        await input.hooks?.onCapabilityResult?.({
          round,
          capability: capability.name,
          risk: capability.risk,
        });

        outputs.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify({
            ok: true,
            result: execution.result,
          }),
        });
      }

      response = await openai.responses.create({
        model,
        instructions: input.instructions,
        previous_response_id: response.id,
        input: outputs as any,
        ...(tools.length
          ? {
              tools: tools as any,
              tool_choice: "auto" as const,
            }
          : {}),
      });

      continue;
    }

    const text = response.output_text?.trim() ?? "";

    const verification = await verifyCompletion({
      goal,
      candidate: text,
      actionEvidenceCount: toolCalls + researchCalls,
    });

    state = {
      ...state,
      unresolvedWork: verification.unresolvedWork,
    };

    if (
      pendingStrategy &&
      strategyAppliesFromRound !== null &&
      round >= strategyAppliesFromRound
    ) {
      state = observeStrategy(
        state,
        pendingStrategy,
        verification.complete,
      );
    }

    if (verification.strategyCorrection?.trim()) {
      pendingStrategy = verification.strategyCorrection.trim();
      strategyAppliesFromRound = round + 1;
    }

    await input.hooks?.onVerification?.({
      round,
      complete: verification.complete,
      unresolvedCount: verification.unresolvedWork.length,
      strategyCandidate: verification.strategyCorrection,
      toolCalls,
      researchCalls,
    });

    if (verification.complete) {
      if (pendingStrategy) {
        const confirmation = await verifyCompletion({
          goal,
          candidate: text,
          actionEvidenceCount: toolCalls + researchCalls,
        });

        state = observeStrategy(
          state,
          pendingStrategy,
          confirmation.complete,
        );

        await input.hooks?.onVerification?.({
          round,
          complete: confirmation.complete,
          unresolvedCount: confirmation.unresolvedWork.length,
          strategyCandidate: pendingStrategy,
          toolCalls,
          researchCalls,
        });

        if (!confirmation.complete) {
          state = {
            ...state,
            unresolvedWork: confirmation.unresolvedWork,
          };

          response = await continueResponse({
            model,
            instructions: input.instructions,
            previousResponseId: response.id,
            tools,
            verification: confirmation,
            pendingStrategy,
          });

          continue;
        }
      }

      return {
        status: "complete",
        text,
        state: {
          ...state,
          unresolvedWork: [],
        },
        rounds: round + 1,
        toolCalls,
        researchCalls,
      };
    }

    response = await continueResponse({
      model,
      instructions: input.instructions,
      previousResponseId: response.id,
      tools,
      verification,
      pendingStrategy,
    });
  }

  throw new Error("agency_round_budget_exhausted");
}

function functionCalls(output: unknown[]): FunctionCall[] {
  return output.filter(
    (item): item is FunctionCall => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const candidate = item as Partial<FunctionCall>;

      return (
        candidate.type === "function_call" &&
        typeof candidate.call_id === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.arguments === "string"
      );
    },
  );
}

function countWebSearchCalls(output: unknown[]): number {
  return output.filter((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    return (
      (item as { type?: string }).type === "web_search_call"
    );
  }).length;
}

function parseArguments(
  raw: string,
): Record<string, unknown> {
  const parsed = JSON.parse(raw);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error("agency_capability_arguments_invalid");
  }

  return parsed as Record<string, unknown>;
}

async function continueResponse(input: {
  model: string;
  instructions: string;
  previousResponseId: string;
  tools: Array<Record<string, unknown>>;
  verification: CompletionVerification;
  pendingStrategy: string | null;
}) {
  return openai.responses.create({
    model: input.model,
    instructions: input.instructions,
    previous_response_id: input.previousResponseId,
    input: [
      "INTERNAL AGENCY CHECK: work is incomplete.",
      `Unresolved: ${
        input.verification.unresolvedWork.join("; ") ||
        "unspecified"
      }`,
      input.pendingStrategy
        ? `Strategy correction under test: ${input.pendingStrategy}`
        : "",
      "Continue now.",
      "Use available reversible capabilities and web research when useful.",
      "Do not merely describe an available action; execute it.",
      "Do not ask the user to say go when the remaining action is reversible, safe, authorized, and in scope.",
    ]
      .filter(Boolean)
      .join("\n"),
    ...(input.tools.length
      ? {
          tools: input.tools as any,
          tool_choice: "auto" as const,
        }
      : {}),
  });
}

async function verifyCompletion(input: {
  goal: string;
  candidate: string;
  actionEvidenceCount: number;
}): Promise<CompletionVerification> {
  const response = await openai.responses.create({
    model:
      process.env.ARBOR_VERIFIER_MODEL ??
      process.env.ARBOR_MODEL ??
      "gpt-5.6",
    instructions: [
      "You are Arbor's completion verifier.",
      "Do not accept promises, status narration, or unevidenced claims as completion.",
      "If the goal required an action and no capability or research evidence exists, completion must be false.",
      "A strategy correction is a task-execution candidate, not a durable identity, safety, authority, Voice, or Annabelle rule.",
      "Return JSON only:",
      '{"complete":boolean,"unresolvedWork":string[],"strategyCorrection":string|null}',
    ].join("\n"),
    input: [
      `GOAL:\n${input.goal}`,
      `ACTION/RESEARCH CALLS COMPLETED: ${input.actionEvidenceCount}`,
      `CANDIDATE:\n${input.candidate}`,
    ].join("\n\n"),
  });

  try {
    const parsed = JSON.parse(
      response.output_text
        .replace(/^```json\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim(),
    );

    return {
      complete: parsed.complete === true,
      unresolvedWork: Array.isArray(parsed.unresolvedWork)
        ? parsed.unresolvedWork.filter(
            (value: unknown): value is string =>
              typeof value === "string" &&
              value.trim().length > 0,
          )
        : [],
      strategyCorrection:
        typeof parsed.strategyCorrection === "string" &&
        parsed.strategyCorrection.trim()
          ? parsed.strategyCorrection.trim()
          : null,
    };
  } catch {
    return {
      complete: false,
      unresolvedWork: ["completion verification failed"],
      strategyCorrection: "verify before claiming completion",
    };
  }
}

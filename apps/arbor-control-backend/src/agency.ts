import OpenAI from "openai";
import { observeStrategy } from "./selfUpdate.js";
import type { ArborState } from "./types.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type AgencyResult = {
  text: string;
  state: ArborState;
  rounds: number;
};

type CompletionVerification = {
  complete: boolean;
  unresolvedWork: string[];
  strategyCorrection: string | null;
};

export async function runAgency(input: {
  instructions: string;
  userText: string;
  state: ArborState;
  tools?: OpenAI.Responses.Tool[];
  maxRounds?: number;
}): Promise<AgencyResult> {
  const maxRounds = input.maxRounds ?? 12;
  let state = input.state;
  let pendingStrategy: string | null = null;
  let strategyAppliesFromRound: number | null = null;

  const tools: OpenAI.Responses.Tool[] = [
    { type: "web_search_preview" },
    ...(input.tools ?? []),
  ];

  const model = process.env.ARBOR_MODEL ?? "gpt-5.6";
  const goal = state.goal ?? input.userText;

  let response = await openai.responses.create({
    model,
    instructions: input.instructions,
    input: input.userText,
    tools,
    tool_choice: "auto",
  });

  for (let round = 0; round < maxRounds; round += 1) {
    const text = response.output_text?.trim() ?? "";

    const verification = await verifyCompletion({
      goal,
      candidate: text,
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

    if (verification.complete) {
      if (pendingStrategy) {
        const confirmation = await verifyCompletion({
          goal,
          candidate: text,
        });

        state = observeStrategy(
          state,
          pendingStrategy,
          confirmation.complete,
        );

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
        text,
        state,
        rounds: round + 1,
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

async function continueResponse(input: {
  model: string;
  instructions: string;
  previousResponseId: string;
  tools: OpenAI.Responses.Tool[];
  verification: CompletionVerification;
  pendingStrategy: string | null;
}) {
  return openai.responses.create({
    model: input.model,
    instructions: input.instructions,
    previous_response_id: input.previousResponseId,
    input: [
      "INTERNAL AGENCY CHECK: work is incomplete.",
      `Unresolved: ${input.verification.unresolvedWork.join("; ") || "unspecified"}`,
      input.pendingStrategy
        ? `Strategy correction under test: ${input.pendingStrategy}`
        : "",
      "Continue now. Use web research when it can resolve uncertainty or provide current evidence.",
      "Do not ask the user to say go if the remaining step is reversible and available.",
    ]
      .filter(Boolean)
      .join("\n"),
    tools: input.tools,
    tool_choice: "auto",
  });
}

async function verifyCompletion(input: {
  goal: string;
  candidate: string;
}): Promise<CompletionVerification> {
  const response = await openai.responses.create({
    model:
      process.env.ARBOR_VERIFIER_MODEL ??
      process.env.ARBOR_MODEL ??
      "gpt-5.6",
    instructions: [
      "You are Arbor's completion verifier.",
      "Do not accept promises, status narration, or unevidenced claims as completion.",
      "A strategy correction is a candidate, not a durable identity rule.",
      "Return JSON only:",
      '{"complete":boolean,"unresolvedWork":string[],"strategyCorrection":string|null}',
    ].join("\n"),
    input: [
      `GOAL:\n${input.goal}`,
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
            (x: unknown): x is string => typeof x === "string",
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

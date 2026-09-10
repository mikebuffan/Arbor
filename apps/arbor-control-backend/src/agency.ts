import OpenAI from "openai";
import type { ArborState } from "./types.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type AgencyResult = {
  text: string;
  state: ArborState;
  rounds: number;
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

  const tools: OpenAI.Responses.Tool[] = [
    { type: "web_search_preview" },
    ...(input.tools ?? []),
  ];

  let response = await openai.responses.create({
    model: process.env.ARBOR_MODEL ?? "gpt-5.6",
    instructions: input.instructions,
    input: input.userText,
    tools,
    tool_choice: "auto",
  });

  for (let round = 0; round < maxRounds; round += 1) {
    const text = response.output_text?.trim() ?? "";

    const verification = await verifyCompletion({
      goal: state.goal ?? input.userText,
      candidate: text,
    });

    state = {
      ...state,
      unresolvedWork: verification.unresolvedWork,
      strategyNotes: verification.strategyCorrection
        ? Array.from(
            new Set([
              ...state.strategyNotes,
              verification.strategyCorrection,
            ]),
          ).slice(-20)
        : state.strategyNotes,
    };

    if (verification.complete) {
      return {
        text,
        state,
        rounds: round + 1,
      };
    }

    response = await openai.responses.create({
      model: process.env.ARBOR_MODEL ?? "gpt-5.6",
      instructions: input.instructions,
      previous_response_id: response.id,
      input: [
        "INTERNAL AGENCY CHECK: work is incomplete.",
        `Unresolved: ${verification.unresolvedWork.join("; ") || "unspecified"}`,
        verification.strategyCorrection
          ? `Strategy correction: ${verification.strategyCorrection}`
          : "",
        "Continue now. Use web research when it can resolve uncertainty or provide current evidence.",
        "Do not ask the user to say go if the remaining step is reversible and available.",
      ]
        .filter(Boolean)
        .join("\n"),
      tools,
      tool_choice: "auto",
    });
  }

  throw new Error("agency_round_budget_exhausted");
}

async function verifyCompletion(input: {
  goal: string;
  candidate: string;
}): Promise<{
  complete: boolean;
  unresolvedWork: string[];
  strategyCorrection: string | null;
}> {
  const response = await openai.responses.create({
    model:
      process.env.ARBOR_VERIFIER_MODEL ??
      process.env.ARBOR_MODEL ??
      "gpt-5.6",
    instructions: [
      "You are Arbor's completion verifier.",
      "Do not accept promises, status narration, or unevidenced claims as completion.",
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
        typeof parsed.strategyCorrection === "string"
          ? parsed.strategyCorrection
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

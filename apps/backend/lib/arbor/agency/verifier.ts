import { openai } from "@/lib/providers/openai";

export type AgencyCompletionVerification = {
  complete: boolean;
  score: number;
  unresolvedWork: string[];
  evidence: string[];
  strategyCorrection: string | null;
};

const EMPTY_FAILURE: AgencyCompletionVerification = {
  complete: false,
  score: 0,
  unresolvedWork: ["completion verification was not parseable"],
  evidence: [],
  strategyCorrection:
    "Do not claim completion until the verifier returns valid evidence.",
};

function stripFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function parseAgencyVerification(
  raw: string,
): AgencyCompletionVerification {
  try {
    const parsed = JSON.parse(stripFence(raw)) as Record<string, unknown>;

    if (typeof parsed.complete !== "boolean") {
      return EMPTY_FAILURE;
    }

    const strings = (value: unknown): string[] =>
      Array.isArray(value)
        ? value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

    const score =
      typeof parsed.score === "number" &&
      Number.isFinite(parsed.score)
        ? Math.max(0, Math.min(1, parsed.score))
        : parsed.complete
          ? 1
          : 0;

    return {
      complete: parsed.complete,
      score,
      unresolvedWork: strings(parsed.unresolvedWork),
      evidence: strings(parsed.evidence),
      strategyCorrection:
        typeof parsed.strategyCorrection === "string" &&
        parsed.strategyCorrection.trim()
          ? parsed.strategyCorrection.trim()
          : null,
    };
  } catch {
    return EMPTY_FAILURE;
  }
}

export async function verifyAgencyCompletion(input: {
  goal: string;
  candidateText: string;
}): Promise<AgencyCompletionVerification> {
  const response = await openai.responses.create({
    model:
      process.env.OPENAI_AGENCY_VERIFIER_MODEL ??
      process.env.OPENAI_AGENCY_MODEL ??
      process.env.OPENAI_MODEL ??
      "gpt-5",
    instructions: [
      "You are Arbor's completion verifier.",
      "Evaluate only whether the candidate actually completes the user's goal.",
      "Do not reward promises to work later, status narration, or descriptions of actions that were not evidenced.",
      "If the goal requires tool/action evidence and the candidate lacks it, mark complete=false.",
      "Do not invent missing evidence.",
      "score must be between 0 and 1 and represent how completely the candidate satisfies the goal based on available evidence.",
      "Return JSON only with exactly these keys:",
      '{"complete":boolean,"score":number,"unresolvedWork":string[],"evidence":string[],"strategyCorrection":string|null}',
    ].join("\n"),
    input: [
      `GOAL:\n${input.goal}`,
      `CANDIDATE:\n${input.candidateText}`,
    ].join("\n\n"),
  });

  return parseAgencyVerification(response.output_text ?? "");
}

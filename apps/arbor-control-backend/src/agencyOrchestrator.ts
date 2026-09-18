import type { AgencyResult } from "./agency.js";

export type AgencyRunner<Input> = (input: Input) => Promise<AgencyResult>;

export type AgencyBoundaryReason =
  | "objective-complete"
  | "genuine-blocker"
  | "authorization-boundary"
  | "execution-ceiling";

export async function runAgencyToBoundary<
  Input extends { state: AgencyResult["state"] },
>(input: {
  initialInput: Input;
  run: AgencyRunner<Input>;
  maxWindows?: number;
}): Promise<AgencyResult & { boundaryReason?: AgencyBoundaryReason }> {
  const maxWindows = input.maxWindows ?? 32;
  let nextInput = input.initialInput;
  let totalRounds = 0;
  let totalToolCalls = 0;
  let totalResearchCalls = 0;

  for (let window = 0; window < maxWindows; window += 1) {
    const result = await input.run(nextInput);
    totalRounds += result.rounds;
    totalToolCalls += result.toolCalls;
    totalResearchCalls += result.researchCalls;

    // A checkpoint is persistence, never a handoff. If work remains, resume it
    // in this same invocation without requiring another user turn.
    if (result.status === "checkpointed") {
      nextInput = { ...nextInput, state: result.state };
      continue;
    }

    const unresolved = result.state.unresolvedWork?.length ?? 0;
    if (result.status === "complete" && unresolved > 0) {
      // Defensive repair: a child window may incorrectly call itself complete
      // while the parent objective still has open work.
      nextInput = { ...nextInput, state: result.state };
      continue;
    }

    return {
      ...result,
      boundaryReason: result.status === "complete" ? "objective-complete" : "genuine-blocker",
      rounds: totalRounds,
      toolCalls: totalToolCalls,
      researchCalls: totalResearchCalls,
    };
  }

  return {
    status: "checkpointed",
    boundaryReason: "execution-ceiling",
    text: "Agency execution ceiling reached; objective remains active and resumable. This is not completion.",
    state: nextInput.state,
    rounds: totalRounds,
    toolCalls: totalToolCalls,
    researchCalls: totalResearchCalls,
  };
}

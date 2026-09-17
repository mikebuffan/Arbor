import type { AgencyResult } from "./agency.js";

export type AgencyRunner<Input> = (
  input: Input,
) => Promise<AgencyResult>;

export async function runAgencyToBoundary<
  Input extends { state: AgencyResult["state"] },
>(input: {
  initialInput: Input;
  run: AgencyRunner<Input>;
  maxWindows?: number;
  prepareNextInput?: (
    input: Input,
    result: Extract<AgencyResult, { status: "checkpointed" }>,
  ) => Input | Promise<Input>;
}): Promise<AgencyResult> {
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

    if (result.status !== "checkpointed") {
      return {
        ...result,
        rounds: totalRounds,
        toolCalls: totalToolCalls,
        researchCalls: totalResearchCalls,
      };
    }

    const stateAdvancedInput = {
      ...nextInput,
      state: result.state,
    };

    nextInput = input.prepareNextInput
      ? await input.prepareNextInput(stateAdvancedInput, result)
      : stateAdvancedInput;
  }

  return {
    status: "checkpointed",
    text: "Agency outer execution ceiling reached; active objective remains checkpointed.",
    state: nextInput.state,
    rounds: totalRounds,
    toolCalls: totalToolCalls,
    researchCalls: totalResearchCalls,
  };
}

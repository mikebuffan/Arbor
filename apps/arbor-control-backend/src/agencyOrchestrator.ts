import type { AgencyResult } from "./agency.js";

export type AgencyRunInput<State> = {
  state: State;
};

export type AgencyRunner<Input, Result> = (
  input: Input,
) => Promise<Result>;

export async function runAgencyToBoundary<
  Input extends { state: Result["state"] },
  Result extends AgencyResult,
>(input: {
  initialInput: Input;
  run: AgencyRunner<Input, Result>;
  maxWindows?: number;
}): Promise<Result> {
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
      } as Result;
    }

    nextInput = {
      ...nextInput,
      state: result.state,
    };
  }

  const exhausted = await input.run(nextInput);

  return {
    ...exhausted,
    rounds: totalRounds + exhausted.rounds,
    toolCalls: totalToolCalls + exhausted.toolCalls,
    researchCalls: totalResearchCalls + exhausted.researchCalls,
  } as Result;
}

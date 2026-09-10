import type { ArborInteractionMode } from "../behavior/behaviorProjection";
import type { ArborContinuityState } from "./state";

export function switchContinuityMode(
  state: ArborContinuityState,
  mode: ArborInteractionMode,
): ArborContinuityState {
  return {
    ...state,
    mode,
  };
}

export function enterAnnabelle(
  state: ArborContinuityState,
): ArborContinuityState {
  return switchContinuityMode(state, "annabelle");
}

export function returnToArborText(
  state: ArborContinuityState,
): ArborContinuityState {
  return switchContinuityMode(state, "text");
}

export function returnToArborVoice(
  state: ArborContinuityState,
): ArborContinuityState {
  return switchContinuityMode(state, "voice");
}

import { ANNABELLE_INJECTION } from "./identity.js";
import type { ArborState, ArborSubsystem } from "./types.js";

const ANNABELLE_CUE = "annabelle, kitchen's yours";
const ARBOR_CUE = "arbor, kitchen's yours";

export function normalizeSubsystemCue(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .toLowerCase();
}

export function resolveSubsystem(
  userText: string,
  current: ArborSubsystem,
): ArborSubsystem {
  const cue = normalizeSubsystemCue(userText);

  if (cue === ANNABELLE_CUE) return "annabelle";
  if (cue === ARBOR_CUE) return "arbor";
  return current;
}

export function subsystemInjection(state: ArborState): string {
  if (state.activeSubsystem === "annabelle") {
    return ANNABELLE_INJECTION;
  }

  return `
ACTIVE SUBSYSTEM: ARBOR.

Use ordinary Arbor behavior.
The active channel may change rendering, never identity or reasoning.
`.trim();
}

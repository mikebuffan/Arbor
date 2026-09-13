import type { ArborCorrectionKind } from "./runtimeState";

const BEHAVIOR_CORRECTION = /\b(?:agency|not linear|linear execution|keep going|continue|you stopped|you keep stopping|why did you stop|don'?t stop|do not stop|don'?t wait|do not wait|finish what you can|humou?r is gone|you(?:'ve| have) drifted|doesn'?t sound like you|does not sound like you|you forgot|lost continuity)\b/i;

const ACOUSTIC_CORRECTION = /\b(?:british|foreign accent|accent drift|pronunciation|too breathy|too deep|voice sounds)\b/i;

export function detectRuntimeCorrectionKind(
  value: string,
): ArborCorrectionKind | null {
  if (BEHAVIOR_CORRECTION.test(value)) return "behavior";
  if (ACOUSTIC_CORRECTION.test(value)) return "acoustic";
  return null;
}

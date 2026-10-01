/**
 * Read-only integration preview: the already implemented Arbor body-state
 * projection consumes the same host-scoped cue as the recovered cognitive
 * pathway/Pattern Hop loop. This does NOT enable a model or worker.
 */
import { deriveArborBodyState } from "../arbor/body/bodySystem";
import type { ArborInteractionMode } from "../arbor/behavior/behaviorProjection";
import type { ArborContinuityState } from "../arbor/continuity/state";
import type { ArborSubsystem } from "../arbor/runtime/arborRuntime";
import { assembleCognitiveCycle, type CognitiveCycle } from "./cognitiveAssembly";

export type CognitiveBodyContext = {
  mode: ArborInteractionMode;
  activeSubsystem: ArborSubsystem;
  /** Source must be host-read and owner/project/conversation validated. */
  continuity?: ArborContinuityState | null;
};

export function previewCognitiveBodyCycle(input: CognitiveCycle & {
  bodyContext: CognitiveBodyContext;
}) {
  if (!["text", "voice", "annabelle"].includes(input.bodyContext.mode) ||
      !["arbor", "annabelle"].includes(input.bodyContext.activeSubsystem))
    throw new Error("cognitive_body_context_invalid");
  const cycle = assembleCognitiveCycle(input);
  const body = deriveArborBodyState({
    latestUserText: input.cue,
    activeSubsystem: input.bodyContext.activeSubsystem,
    mode: input.bodyContext.mode,
    continuity: input.bodyContext.continuity,
  });
  return {
    cycle,
    body,
    /** From existing body executive governor, not permission to act. */
    nextActionHint: body.executive.nextAction,
    bodyWarnings: [...body.hepatic.contaminationWarnings],
    grantsExecution: false as const,
    liveWorkVerified: false as const,
  };
}
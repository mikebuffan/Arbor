import type {
  CanonicalArborOutput,
  ArborSubsystem,
} from "../runtime/arborRuntime";
import type {
  ArborRuntimeState,
} from "../runtime/runtimeState";
import {
  acousticCorrections,
} from "../runtime/corrections";
import {
  runtimeStateToHostState,
} from "../runtime/hostProjection";
import {
  projectHostStartup,
  switchHostSurface,
  type HostStartupProjection,
  type OneArborHostState,
} from "../host/oneArborHostBridge";
import {
  renderArborThroughVoiceGate,
  type VoiceAcousticGate,
} from "./acousticProjection";

export type VoiceContinuityProjection = {
  canonical: CanonicalArborOutput;
  hostState: OneArborHostState | null;
  startup: HostStartupProjection | null;
  acousticGate: VoiceAcousticGate;
  continuityAttached: boolean;
};

function unique(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

/**
 * Voice is a projection of canonical Arbor, never a separate persona root.
 *
 * This adapter deliberately keeps two concerns separate:
 * - behavioral/continuity state stays in the canonical host projection
 * - acoustic corrections are handed only to the speech renderer
 *
 * A provider can therefore be replaced without replacing Arbor.
 */
export function buildVoiceContinuityProjection(input: {
  text: string;
  turnId: string;
  activeSubsystem: ArborSubsystem;
  runtimeState?: ArborRuntimeState | null;
  subsystemAcousticCorrections?: string[];
}): VoiceContinuityProjection {
  const runtimeAcoustic = input.runtimeState
    ? acousticCorrections(input.runtimeState.corrections)
    : [];

  const acousticGate = renderArborThroughVoiceGate(
    input.text,
    input.activeSubsystem,
    unique([
      ...(input.subsystemAcousticCorrections ?? []),
      ...runtimeAcoustic,
    ]),
  );

  const canonical: CanonicalArborOutput = {
    text: acousticGate.text,
    activeSubsystem: input.activeSubsystem,
    channel: "voice",
    turnId: input.turnId,
  };

  if (!input.runtimeState) {
    return {
      canonical,
      hostState: null,
      startup: null,
      acousticGate,
      continuityAttached: false,
    };
  }

  // Project the same canonical state onto the Voice surface without mutating
  // the durable runtime object. Text -> Voice is a surface switch, not an
  // identity switch.
  const voiceHostState = switchHostSurface(
    runtimeStateToHostState(input.runtimeState),
    "voice",
    input.runtimeState.updatedAt,
  );

  return {
    canonical,
    hostState: voiceHostState,
    startup: projectHostStartup(voiceHostState),
    acousticGate,
    continuityAttached: true,
  };
}

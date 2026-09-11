import {
  buildVoiceInstructions,
  type ArborVoicePersona,
  voiceSpeechSpeed,
} from "./identity";

export type VoiceAcousticProjection = {
  persona: ArborVoicePersona;
  corrections: string[];
  instructions: string;
  speed: number;
};

export type VoiceAcousticGate = VoiceAcousticProjection & {
  text: string;
};

function uniqueCorrections(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

export function projectVoiceAcoustics(
  persona: ArborVoicePersona,
  corrections: string[] = [],
): VoiceAcousticProjection {
  const canonicalCorrections = uniqueCorrections(corrections);

  return {
    persona,
    corrections: canonicalCorrections,
    instructions: buildVoiceInstructions(persona, canonicalCorrections),
    speed: voiceSpeechSpeed(persona),
  };
}

export function renderArborThroughVoiceGate(
  text: string,
  persona: ArborVoicePersona,
  corrections: string[] = [],
): VoiceAcousticGate {
  return {
    text,
    ...projectVoiceAcoustics(persona, corrections),
  };
}

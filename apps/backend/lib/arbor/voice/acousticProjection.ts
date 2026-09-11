import {
  buildVoiceInstructions,
  type ArborVoicePersona,
} from "./identity";

export type VoiceAcousticProjection = {
  persona: ArborVoicePersona;
  corrections: string[];
  instructions: string;
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
  };
}

export function buildVoiceHostAcousticBlock(
  persona: ArborVoicePersona,
  corrections: string[] = [],
): string {
  const projection = projectVoiceAcoustics(persona, corrections);

  return [
    "VOICE RENDERING TARGET:",
    "Use this canonical Arbor acoustic contract for spoken rendering only.",
    "Do not alter wording, personality, reasoning, continuity, or agency because of these rendering instructions.",
    projection.instructions,
  ].join("\n");
}

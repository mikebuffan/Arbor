import type { ArborAdapter } from "./types";
import type { CanonicalArborOutput } from "@/lib/arbor/runtime/arborRuntime";

export type VoiceIdentity = {
  voiceId: string;
  instructions: string;
};

export interface SpeechRenderer {
  synthesize(input: {
    text: string;
    voiceId: string;
    instructions: string;
    turnId: string;
  }): Promise<Uint8Array>;
}

export class VoiceAdapter implements ArborAdapter<Uint8Array> {
  constructor(
    private readonly speech: SpeechRenderer,
    private readonly identity: VoiceIdentity,
  ) {}

  async render(canonical: CanonicalArborOutput): Promise<Uint8Array> {
    return this.speech.synthesize({
      text: canonical.text,
      voiceId: this.identity.voiceId,
      instructions: this.identity.instructions,
      turnId: canonical.turnId,
    });
  }
}

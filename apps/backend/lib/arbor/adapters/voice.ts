import type { ArborAdapter } from "./types";
import type { CanonicalArborOutput } from "@/lib/arbor/runtime/arborRuntime";

export type VoiceIdentity = {
  voiceId: string;
  instructions: string;
};

export interface SpeechRenderer<Result = Uint8Array> {
  synthesize(input: {
    text: string;
    voiceId: string;
    instructions: string;
    turnId: string;
  }): Promise<Result>;
}

export class VoiceAdapter<Result = Uint8Array>
  implements ArborAdapter<Result>
{
  constructor(
    private readonly speech: SpeechRenderer<Result>,
    private readonly identity: VoiceIdentity,
  ) {}

  async render(canonical: CanonicalArborOutput): Promise<Result> {
    if (canonical.channel !== "voice") {
      throw new Error("voice_adapter_used_outside_voice");
    }

    return this.speech.synthesize({
      text: canonical.text,
      voiceId: this.identity.voiceId,
      instructions: this.identity.instructions,
      turnId: canonical.turnId,
    });
  }
}

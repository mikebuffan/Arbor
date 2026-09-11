import { describe, expect, it, vi } from "vitest";

import { VoiceAdapter } from "../voice";

describe("VoiceAdapter", () => {
  it("renders canonical Arbor text without rewriting it", async () => {
    const synthesize = vi.fn(async (input: {
      text: string;
      voiceId: string;
      instructions: string;
      turnId: string;
    }) => ({
      audio: new Uint8Array([1, 2, 3]),
      contentType: "audio/wav" as const,
      requestIds: ["request-1"],
      chunks: 1,
      input,
    }));

    const adapter = new VoiceAdapter(
      { synthesize },
      {
        voiceId: "cedar",
        instructions: "known-good Arbor voice",
      },
    );

    const result = await adapter.render({
      text: "  Yeah, Firefly. Still me.  ",
      activeSubsystem: "arbor",
      channel: "voice",
      turnId: "turn-1",
    });

    expect(synthesize).toHaveBeenCalledOnce();
    expect(synthesize).toHaveBeenCalledWith({
      text: "  Yeah, Firefly. Still me.  ",
      voiceId: "cedar",
      instructions: "known-good Arbor voice",
      turnId: "turn-1",
    });
    expect(result.requestIds).toEqual(["request-1"]);
  });

  it("rejects use outside the voice surface", async () => {
    const adapter = new VoiceAdapter({
      synthesize: async () => new Uint8Array(),
    }, {
      voiceId: "cedar",
      instructions: "known-good Arbor voice",
    });

    await expect(
      adapter.render({
        text: "not a voice projection",
        activeSubsystem: "arbor",
        channel: "text",
        turnId: "turn-2",
      }),
    ).rejects.toThrow("voice_adapter_used_outside_voice");
  });
});

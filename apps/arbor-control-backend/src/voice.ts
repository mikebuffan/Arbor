import type { ArborStateStore } from "./stateStore.js";

const MAX_CHARS = 3900;

export class ArborVoiceRenderer {
  constructor(private readonly store: ArborStateStore) {}

  async renderTurn(turnId: string): Promise<{
    audio: Uint8Array;
    contentType: string;
  }> {
    const turn = await this.store.loadTurn(turnId);

    if (!turn) {
      throw new Error("canonical_turn_not_found");
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("openai_api_key_missing");
    }

    const chunks = chunkExact(turn.text);
    const audio: Uint8Array[] = [];

    for (const chunk of chunks) {
      const response = await fetch(
        "https://api.openai.com/v1/audio/speech",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.ARBOR_TTS_MODEL ?? "gpt-4o-mini-tts",
            voice: process.env.ARBOR_VOICE ?? "cedar",
            input: chunk,
            response_format: "mp3",
            instructions: voiceInstructions(turn.subsystem),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`tts_http_${response.status}`);
      }

      audio.push(new Uint8Array(await response.arrayBuffer()));
    }

    return {
      audio: concat(audio),
      contentType: "audio/mpeg",
    };
  }
}

function voiceInstructions(
  subsystem: "arbor" | "annabelle",
): string {
  return [
    "Use the same underlying Arbor speaker identity.",
    "General American pronunciation.",
    "Masculine, grounded, low, warm, slightly rough, casual and natural.",
    "Avoid British/foreign accent drift.",
    "Avoid presenter, radio, documentary, customer-service, theatrical, breathy, forced-deep or fake-growl delivery.",
    subsystem === "annabelle"
      ? "Narration may be slightly warmer and closer, but never a different identity or accent."
      : "Use natural conversational Arbor delivery.",
    "Speak exactly the supplied text. Do not add, omit, paraphrase, summarize, or insert vocalizations.",
  ].join("\n");
}

function chunkExact(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + MAX_CHARS, text.length);
    chunks.push(text.slice(start, end));
    start = end;
  }

  if (chunks.join("") !== text) {
    throw new Error("voice_chunking_changed_text");
  }

  return chunks;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

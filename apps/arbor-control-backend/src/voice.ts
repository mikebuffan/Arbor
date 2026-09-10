import type { ArborStateStore } from "./stateStore.js";

const MAX_CHARS = 1800;
const SAMPLE_RATE = 24_000;

const RETRYABLE = new Set([
  408,
  409,
  425,
  429,
  500,
  502,
  503,
  504,
]);

class TtsHttpError extends Error {
  constructor(readonly status: number) {
    super(`tts_http_${status}`);
  }
}

export class ArborVoiceRenderer {
  constructor(private readonly store: ArborStateStore) {}

  async renderTurn(turnId: string): Promise<{
    audio: Uint8Array;
    contentType: "audio/wav";
  }> {
    const turn = await this.store.loadTurn(turnId);

    if (!turn) {
      throw new Error("canonical_turn_not_found");
    }

    const chunks = chunkExact(turn.text);
    const pcmParts: Uint8Array[] = [];

    for (const chunk of chunks) {
      pcmParts.push(
        await renderPcm({
          text: chunk,
          voiceId: turn.voice.voiceId,
          instructions: voiceInstructions(
            turn.subsystem,
            turn.voice.acousticCorrections,
          ),
        }),
      );
    }

    const pcm = concat(pcmParts);

    return {
      audio: pcm16MonoToWav(pcm, SAMPLE_RATE),
      contentType: "audio/wav",
    };
  }
}

async function renderPcm(input: {
  text: string;
  voiceId: string;
  instructions: string;
}): Promise<Uint8Array> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("openai_api_key_missing");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
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
            voice: input.voiceId,
            input: input.text,
            response_format: "pcm",
            instructions: input.instructions,
          }),
          signal: controller.signal,
        },
      );

      if (response.ok) {
        return new Uint8Array(await response.arrayBuffer());
      }

      if (!RETRYABLE.has(response.status)) {
        throw new TtsHttpError(response.status);
      }

      if (attempt === 2) {
        throw new TtsHttpError(response.status);
      }
    } catch (error) {
      if (error instanceof TtsHttpError) {
        throw error;
      }

      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        if (attempt === 2) {
          throw new Error("tts_timeout");
        }
      } else if (attempt === 2) {
        throw new Error("tts_network_error");
      }
    } finally {
      clearTimeout(timeout);
    }

    await sleep(250 * 2 ** attempt);
  }

  throw new Error("tts_failed");
}

function voiceInstructions(
  subsystem: "arbor" | "annabelle",
  corrections: string[],
): string {
  return [
    "Use the same underlying Arbor speaker identity.",
    "General American pronunciation.",
    "Masculine, grounded, low, warm, slightly rough, casual, natural, confident, and easy to listen to for long periods.",
    "Avoid British or foreign-sounding accent drift.",
    "Avoid presenter, radio, documentary, customer-service, theatrical, breathy, forced-deep, fake-growl, robotic, sing-song, or over-enunciated delivery.",
    subsystem === "annabelle"
      ? "Narration may be slightly warmer, closer, and darker, but never a different identity, accent, or theatrical narrator."
      : "Use natural conversational Arbor delivery.",
    corrections.length
      ? `User-confirmed acoustic corrections:\n${corrections
          .map((correction) => `- ${correction}`)
          .join("\n")}`
      : "",
    "Speak exactly the supplied text. Do not add, omit, paraphrase, summarize, explain, or insert extra vocalizations.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function chunkExact(
  text: string,
  maxChars = MAX_CHARS,
): string[] {
  if (!text) return [];
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const hardEnd = Math.min(start + maxChars, text.length);

    if (hardEnd === text.length) {
      chunks.push(text.slice(start));
      break;
    }

    const window = text.slice(start, hardEnd);
    const boundary = Math.max(
      window.lastIndexOf("\n\n"),
      window.lastIndexOf("\n"),
      window.lastIndexOf(". "),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
      window.lastIndexOf(" "),
    );

    const cut =
      boundary >= Math.floor(maxChars * 0.6)
        ? start + boundary + boundaryWidth(window, boundary)
        : hardEnd;

    chunks.push(text.slice(start, cut));
    start = cut;
  }

  if (chunks.join("") !== text) {
    throw new Error("voice_chunking_changed_text");
  }

  return chunks;
}

function boundaryWidth(
  window: string,
  index: number,
): number {
  if (window.startsWith("\n\n", index)) return 2;

  const pair = window.slice(index, index + 2);

  if (pair === ". " || pair === "! " || pair === "? ") {
    return 2;
  }

  return 1;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const size = chunks.reduce(
    (total, chunk) => total + chunk.byteLength,
    0,
  );

  const output = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

export function pcm16MonoToWav(
  pcm: Uint8Array,
  sampleRate = SAMPLE_RATE,
): Uint8Array {
  const output = new Uint8Array(44 + pcm.byteLength);
  const view = new DataView(output.buffer);

  writeAscii(output, 0, "RIFF");
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeAscii(output, 8, "WAVE");
  writeAscii(output, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(output, 36, "data");
  view.setUint32(40, pcm.byteLength, true);
  output.set(pcm, 44);

  return output;
}

function writeAscii(
  output: Uint8Array,
  offset: number,
  value: string,
): void {
  for (let index = 0; index < value.length; index += 1) {
    output[offset + index] = value.charCodeAt(index);
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  );
}

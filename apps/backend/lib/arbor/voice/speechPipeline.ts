import { synthesizeOpenAiTts } from "./openaiTts";

const MAX_TTS_CHARS = 3900;
const PCM_SAMPLE_RATE = 24_000;
const PCM_CHANNELS = 1;
const PCM_BITS_PER_SAMPLE = 16;

export type ArborSpeechInput = {
  text: string;
  instructions: string;
  voice: string;
  speed?: number;
};

export type ArborSpeechResult = {
  audio: Uint8Array;
  contentType: "audio/wav";
  requestIds: string[];
  chunks: number;
};

export function chunkCanonicalSpeechText(
  text: string,
  maxChars = MAX_TTS_CHARS,
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
    const candidates = [
      window.lastIndexOf("\n\n"),
      window.lastIndexOf("\n"),
      window.lastIndexOf(". "),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
      window.lastIndexOf("; "),
      window.lastIndexOf(", "),
      window.lastIndexOf(" "),
    ];

    const localCut = Math.max(...candidates);
    const cut =
      localCut >= Math.floor(maxChars * 0.6)
        ? start + localCut + boundaryWidth(window, localCut)
        : hardEnd;

    chunks.push(text.slice(start, cut));
    start = cut;
  }

  if (chunks.join("") !== text) {
    throw new Error("voice_chunking_changed_canonical_text");
  }

  return chunks;
}

function boundaryWidth(window: string, index: number): number {
  if (window.startsWith("\n\n", index)) return 2;

  const pair = window.slice(index, index + 2);

  if (
    pair === ". " ||
    pair === "! " ||
    pair === "? " ||
    pair === "; " ||
    pair === ", "
  ) {
    return 2;
  }

  return 1;
}

export async function synthesizeArborSpeech(
  input: ArborSpeechInput,
): Promise<ArborSpeechResult> {
  const chunks = chunkCanonicalSpeechText(input.text);

  if (!chunks.length) {
    throw new Error("voice_text_empty");
  }

  const pcmParts: Uint8Array[] = [];
  const requestIds: string[] = [];

  for (const chunk of chunks) {
    const rendered = await synthesizeOpenAiTts({
      text: chunk,
      instructions: input.instructions,
      voice: input.voice,
      speed: input.speed,
      format: "pcm",
    });

    pcmParts.push(rendered.audio);

    if (rendered.requestId) {
      requestIds.push(rendered.requestId);
    }
  }

  const pcm = concatBytes(pcmParts);

  return {
    audio: pcm16MonoToWav(pcm, PCM_SAMPLE_RATE),
    contentType: "audio/wav",
    requestIds,
    chunks: chunks.length,
  };
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce(
    (total, part) => total + part.byteLength,
    0,
  );

  const result = new Uint8Array(size);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }

  return result;
}

export function pcm16MonoToWav(
  pcm: Uint8Array,
  sampleRate = PCM_SAMPLE_RATE,
): Uint8Array {
  const headerSize = 44;
  const output = new Uint8Array(headerSize + pcm.byteLength);
  const view = new DataView(output.buffer);

  writeAscii(output, 0, "RIFF");
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeAscii(output, 8, "WAVE");
  writeAscii(output, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, PCM_CHANNELS, true);
  view.setUint32(24, sampleRate, true);

  const byteRate =
    sampleRate * PCM_CHANNELS * (PCM_BITS_PER_SAMPLE / 8);

  view.setUint32(28, byteRate, true);
  view.setUint16(
    32,
    PCM_CHANNELS * (PCM_BITS_PER_SAMPLE / 8),
    true,
  );
  view.setUint16(34, PCM_BITS_PER_SAMPLE, true);
  writeAscii(output, 36, "data");
  view.setUint32(40, pcm.byteLength, true);
  output.set(pcm, headerSize);

  return output;
}

function writeAscii(
  target: Uint8Array,
  offset: number,
  text: string,
): void {
  for (let index = 0; index < text.length; index += 1) {
    target[offset + index] = text.charCodeAt(index);
  }
}

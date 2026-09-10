import {
  describe,
  expect,
  it,
} from "vitest";

import {
  chunkCanonicalSpeechText,
  pcm16MonoToWav,
} from "../speechPipeline";

describe(
  "Arbor speech pipeline",
  () => {
    it(
      "splits long text without changing a single character",
      () => {
        const text =
          Array.from(
            {
              length: 900,
            },
            (_, index) => `Sentence ${index}. `,
          ).join("");

        const chunks = chunkCanonicalSpeechText(text);

        expect(chunks.length).toBeGreaterThan(1);
        expect(
          chunks.every((chunk) => chunk.length <= 3900),
        ).toBe(true);
        expect(chunks.join("")).toBe(text);
      },
    );

    it(
      "falls back to a hard boundary without losing characters",
      () => {
        const text = "x".repeat(10_000);
        const chunks = chunkCanonicalSpeechText(text);

        expect(chunks.join("")).toBe(text);
        expect(
          chunks.every((chunk) => chunk.length <= 3900),
        ).toBe(true);
      },
    );

    it(
      "wraps PCM in a valid 24kHz mono 16-bit WAV header",
      () => {
        const pcm = new Uint8Array([1, 2, 3, 4]);
        const wav = pcm16MonoToWav(pcm);

        const ascii = (start: number, length: number) =>
          String.fromCharCode(
            ...wav.slice(start, start + length),
          );

        const view = new DataView(
          wav.buffer,
          wav.byteOffset,
          wav.byteLength,
        );

        expect(ascii(0, 4)).toBe("RIFF");
        expect(ascii(8, 4)).toBe("WAVE");
        expect(view.getUint16(22, true)).toBe(1);
        expect(view.getUint32(24, true)).toBe(24_000);
        expect(view.getUint16(34, true)).toBe(16);
        expect(wav.slice(44)).toEqual(pcm);
      },
    );
  },
);

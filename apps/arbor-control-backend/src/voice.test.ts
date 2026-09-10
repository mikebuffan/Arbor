import { describe, expect, it } from "vitest";
import { chunkExact, pcm16MonoToWav } from "./voice.js";

describe("Voice renderer primitives", () => {
  it("chunks without changing canonical text", () => {
    const text = Array.from(
      { length: 1000 },
      (_, index) => `Sentence ${index}. `,
    ).join("");

    const chunks = chunkExact(text);

    expect(chunks.length).toBeGreaterThan(1);
    expect(
      chunks.every((chunk) => chunk.length <= 1800),
    ).toBe(true);
    expect(chunks.join("")).toBe(text);
  });

  it("creates a valid 24kHz mono 16-bit WAV", () => {
    const pcm = new Uint8Array([1, 2, 3, 4]);
    const wav = pcm16MonoToWav(pcm);

    const header = String.fromCharCode(...wav.slice(0, 4));
    const wave = String.fromCharCode(...wav.slice(8, 12));
    const view = new DataView(
      wav.buffer,
      wav.byteOffset,
      wav.byteLength,
    );

    expect(header).toBe("RIFF");
    expect(wave).toBe("WAVE");
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(24_000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(wav.slice(44)).toEqual(pcm);
  });
});

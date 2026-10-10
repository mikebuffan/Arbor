import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  synthesizeArborSpeech,
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

it("keeps a Unicode character intact at a hard speech boundary", () => {
  const text = "x".repeat(3899) + "😀" + "z".repeat(3900);
  const chunks = chunkCanonicalSpeechText(text);
  expect(chunks.join("")).toBe(text);
  expect(chunks.every(chunk => chunk.length <= 3900)).toBe(true);
  expect(chunks.map(chunk => Buffer.from(chunk, "utf8").toString("utf8")).join("")).toBe(text);
});

it.each([0, 1, -1, 2.5, NaN, Infinity])("rejects a non-progressing chunk limit %s", limit => {
  expect(() => chunkCanonicalSpeechText("😀abc", limit)).toThrow("voice_chunk_limit_invalid");
});
it("preserves consecutive Unicode pairs at the smallest valid chunk limit", () => {
  expect(chunkCanonicalSpeechText("😀😀x", 2)).toEqual(["😀", "😀", "x"]);
});

const mockTts = vi.hoisted(() => vi.fn());
vi.mock("../openaiTts", () => ({ synthesizeOpenAiTts: mockTts }));
it("passes whole Unicode characters through the actual speech request loop", async () => {
  mockTts.mockResolvedValue({ audio: new Uint8Array([0, 0]), requestId: "synthetic" });
  const text = "x".repeat(3899) + "😀" + "z".repeat(3900);
  const result = await synthesizeArborSpeech({ text, voice: "cedar", instructions: "Synthetic test" });
  const requests = mockTts.mock.calls.map(([request]) => request);
  expect(requests).toHaveLength(result.chunks);
  expect(requests.every(request => request.text.length <= 3900 && request.format === "pcm")).toBe(true);
  expect(requests.map(request => Buffer.from(request.text, "utf8").toString("utf8")).join("")).toBe(text);
  expect(result.contentType).toBe("audio/wav");
});

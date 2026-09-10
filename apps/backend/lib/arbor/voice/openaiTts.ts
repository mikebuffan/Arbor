export type ArborAudioFormat =
  | "mp3"
  | "wav"
  | "opus"
  | "aac"
  | "flac"
  | "pcm";

export type OpenAiTtsInput = {
  text: string;
  instructions: string;
  voice: string;
  model?: string;
  format?: ArborAudioFormat;
  speed?: number;
  timeoutMs?: number;
};

export type OpenAiTtsResult = {
  audio: Uint8Array;
  requestId: string | null;
  contentType: string;
};

const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export async function synthesizeOpenAiTts(
  input: OpenAiTtsInput,
): Promise<OpenAiTtsResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("openai_tts_unavailable");

  if (input.text.length > 4096) {
    throw new Error("openai_tts_input_too_long");
  }

  const payload = {
    model:
      input.model ??
      process.env.ARBOR_OPENAI_TTS_MODEL ??
      "gpt-4o-mini-tts",
    voice: input.voice,
    input: input.text,
    instructions: input.instructions,
    response_format: input.format ?? "mp3",
    ...(typeof input.speed === "number"
      ? { speed: Math.min(4, Math.max(0.25, input.speed)) }
      : {}),
  };

  const timeoutMs = input.timeoutMs ?? 20_000;
  let lastStatus: number | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      lastStatus = response.status;

      if (response.ok) {
        return {
          audio: new Uint8Array(await response.arrayBuffer()),
          requestId: response.headers.get("x-request-id"),
          contentType: response.headers.get("content-type") ?? "audio/mpeg",
        };
      }

      if (!RETRYABLE.has(response.status) || attempt === 2) {
        throw new Error(`openai_tts_http_${response.status}`);
      }
    } catch (error) {
      if (attempt === 2) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("openai_tts_timeout");
        }
        if (
          error instanceof Error &&
          String(error.message).startsWith("openai_tts_http_")
        ) {
          throw error;
        }
        throw new Error("openai_tts_network_error");
      }

      if (
        error instanceof Error &&
        String(error.message).startsWith("openai_tts_http_") &&
        !RETRYABLE.has(Number(String(error.message).split("_").pop()))
      ) {
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }

    await delay(250 * 2 ** attempt);
  }

  throw new Error(
    lastStatus == null ? "openai_tts_failed" : `openai_tts_http_${lastStatus}`,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

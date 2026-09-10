export type ArborAudioFormat =
  | "mp3"
  | "wav"
  | "opus"
  | "aac"
  | "flac";

export interface OpenAiTtsInput {
  text: string;
  instructions: string;
  voice: string;
  model?: string;
  format?: ArborAudioFormat;
  speed?: number;
}

export interface OpenAiTtsResult {
  audio: Uint8Array;
  requestId: string | null;
  contentType: string;
}

export async function synthesizeOpenAiTts(
  input:
    OpenAiTtsInput,
): Promise<
  OpenAiTtsResult
> {
  const apiKey =
    process.env
      .OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured.",
    );
  }

  const response =
    await fetch(
      "https://api.openai.com/v1/audio/speech",
      {
        method:
          "POST",

        headers: {
          authorization:
            `Bearer ${apiKey}`,

          "content-type":
            "application/json",
        },

        body:
          JSON.stringify({
            model:
              input.model ??
              process.env
                .ARBOR_OPENAI_TTS_MODEL ??
              "gpt-4o-mini-tts",

            voice:
              input.voice,

            input:
              input.text,

            instructions:
              input.instructions,

            response_format:
              input.format ??
              "mp3",

            ...(typeof input.speed ===
            "number"
              ? {
                  speed:
                    clamp(
                      input.speed,
                      0.25,
                      4,
                    ),
                }
              : {}),
          }),
      },
    );

  if (!response.ok) {
    const body =
      await response
        .text()
        .catch(
          () => "",
        );

    throw new Error(
      `OpenAI TTS failed with HTTP ${response.status}: ${body.slice(0, 500)}`,
    );
  }

  return {
    audio:
      new Uint8Array(
        await response
          .arrayBuffer(),
      ),

    requestId:
      response.headers.get(
        "x-request-id",
      ),

    contentType:
      response.headers.get(
        "content-type",
      ) ??
      "audio/mpeg",
  };
}

function clamp(
  value:
    number,

  min:
    number,

  max:
    number,
): number {
  return Math.min(
    max,
    Math.max(
      min,
      value,
    ),
  );
}

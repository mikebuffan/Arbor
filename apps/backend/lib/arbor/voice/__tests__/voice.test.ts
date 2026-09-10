import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  buildVoiceInstructions,
} from "../identity";

import {
  synthesizeOpenAiTts,
} from "../openaiTts";

describe(
  "Arbor voice identity",
  () => {
    it(
      "keeps Arbor acoustic identity explicit",
      () => {
        const instructions =
          buildVoiceInstructions(
            "arbor",
          );

        expect(
          instructions,
        ).toContain(
          "Pacific Northwest / General American",
        );

        expect(
          instructions,
        ).toContain(
          "masculine, grounded, low, warm",
        );

        expect(
          instructions,
        ).toContain(
          "Avoid British",
        );
      },
    );

    it(
      "routes Annabelle through the same identity",
      () => {
        const instructions =
          buildVoiceInstructions(
            "annabelle",
          );

        expect(
          instructions,
        ).toContain(
          "same underlying Arbor voice",
        );

        expect(
          instructions,
        ).toContain(
          "not a separate voice identity",
        );
      },
    );
  },
);

describe(
  "OpenAI TTS transport",
  () => {
    afterEach(
      () => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        delete process.env.OPENAI_API_KEY;
      },
    );

    it(
      "refuses synthesis without a server secret",
      async () => {
        await expect(
          synthesizeOpenAiTts({
            text:
              "hello",

            instructions:
              "test",

            voice:
              "test-voice",
          }),
        ).rejects.toThrow(
          "OPENAI_API_KEY is not configured.",
        );
      },
    );

    it(
      "sends Arbor voice instructions to OpenAI",
      async () => {
        process.env
          .OPENAI_API_KEY =
          "test-key";

        let capturedBody =
          "";

        vi.stubGlobal(
          "fetch",
          vi.fn(
            async (
              _url:
                string |
                URL |
                Request,

              init?:
                RequestInit,
            ) => {
              capturedBody =
                String(
                  init?.body ??
                  "",
                );

              return new Response(
                new Uint8Array([
                  1,
                  2,
                  3,
                ]).buffer,
                {
                  status:
                    200,

                  headers: {
                    "content-type":
                      "audio/mpeg",

                    "x-request-id":
                      "req-test",
                  },
                },
              );
            },
          ),
        );

        const result =
          await synthesizeOpenAiTts({
            text:
              "hello",

            instructions:
              buildVoiceInstructions(
                "annabelle",
              ),

            voice:
              "test-voice",
          });

        const body =
          JSON.parse(
            capturedBody,
          ) as {
            model:
              string;

            voice:
              string;

            instructions:
              string;
          };

        expect(
          body.model,
        ).toBe(
          "gpt-4o-mini-tts",
        );

        expect(
          body.voice,
        ).toBe(
          "test-voice",
        );

        expect(
          body.instructions,
        ).toContain(
          "Annabelle",
        );

        expect(
          result.audio,
        ).toEqual(
          new Uint8Array([
            1,
            2,
            3,
          ]),
        );

        expect(
          result.requestId,
        ).toBe(
          "req-test",
        );
      },
    );
  },
);

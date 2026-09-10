import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ArborControlClient,
} from "./clientAdapter.js";

function jsonResponse(
  body:
    unknown,
): Response {
  return new Response(
    JSON.stringify(
      body,
    ),
    {
      status:
        200,
      headers: {
        "content-type":
          "application/json",
      },
    },
  );
}

describe(
  "unified Arbor client routing",
  () => {
    it(
      "routes Text and Annabelle through the same canonical turn endpoint",
      async () => {
        const calls:
          string[] =
          [];

        const fetchImpl =
          (async (
            input:
              string |
              URL |
              Request,
            init?:
              RequestInit,
          ) => {
            const url =
              String(
                input,
              );

            calls.push(
              url,
            );

            const body =
              JSON.parse(
                String(
                  init
                    ?.body,
                ),
              );

            return jsonResponse({
              ok:
                true,
              text:
                `reply:${body.userText}`,
              turnId:
                crypto.randomUUID(),
              subsystem:
                body
                  .userText
                  .startsWith(
                    "Annabelle",
                  )
                  ? "annabelle"
                  : "arbor",
              channel:
                body.channel,
              voice: {
                voiceId:
                  "cedar",
                acousticCorrections:
                  [],
              },
            });
          }) as
          typeof fetch;

        const client =
          new ArborControlClient({
            baseUrl:
              "https://arbor.example",
            controlToken:
              "secret",
            fetchImpl,
          });

        await client.sendText(
          "hello",
        );

        await client.enterAnnabelle();

        expect(
          calls,
        ).toEqual([
          "https://arbor.example/v1/turn",
          "https://arbor.example/v1/turn",
        ]);
      },
    );

    it(
      "routes Voice through canonical generation before audio rendering",
      async () => {
        const calls:
          string[] =
          [];

        const fetchImpl =
          (async (
            input:
              string |
              URL |
              Request,
          ) => {
            const url =
              String(
                input,
              );

            calls.push(
              url,
            );

            if (
              url.endsWith(
                "/v1/turn",
              )
            ) {
              return jsonResponse({
                ok:
                  true,
                text:
                  "same canonical text",
                turnId:
                  "voice-turn",
                subsystem:
                  "arbor",
                channel:
                  "voice",
                voice: {
                  voiceId:
                    "cedar",
                  acousticCorrections:
                    [],
                },
              });
            }

            return new Response(
              new Uint8Array([
                1,
                2,
                3,
              ]),
              {
                status:
                  200,
                headers: {
                  "content-type":
                    "audio/wav",
                },
              },
            );
          }) as
          typeof fetch;

        const client =
          new ArborControlClient({
            baseUrl:
              "https://arbor.example",
            controlToken:
              "secret",
            fetchImpl,
          });

        const result =
          await client.sendVoice(
            "say it",
          );

        expect(
          calls,
        ).toEqual([
          "https://arbor.example/v1/turn",
          "https://arbor.example/v1/voice/voice-turn",
        ]);

        expect(
          result.turn.text,
        ).toBe(
          "same canonical text",
        );

        expect(
          result.audio
            .byteLength,
        ).toBe(
          3,
        );
      },
    );
  },
);

import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  requireUser,
} from "@/lib/auth/requireUser";

import {
  routeErrorResponse,
} from "@/lib/auth/routeAuthorization";

import {
  buildVoiceInstructions,
} from "@/lib/arbor/voice/identity";

import {
  synthesizeOpenAiTts,
} from "@/lib/arbor/voice/openaiTts";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const Body =
  z.object({
    text:
      z.string()
        .min(1)
        .max(12000),

    sourceMode:
      z.enum([
        "text",
        "voice",
        "annabelle",
      ])
        .default(
          "voice",
        ),

    persona:
      z.enum([
        "arbor",
        "annabelle",
      ])
        .default(
          "arbor",
        ),

    voiceId:
      z.string()
        .min(1)
        .max(100)
        .optional(),

    speed:
      z.number()
        .min(0.25)
        .max(4)
        .optional(),
  });

function getCorsHeaders(
  req:
    Request,
) {
  const origin =
    req.headers.get(
      "origin",
    ) ??
    "*";

  return {
    "access-control-allow-origin":
      origin,

    vary:
      "origin",

    "access-control-allow-methods":
      "POST, OPTIONS",

    "access-control-allow-headers":
      "content-type, authorization, apikey, x-client-info",

    "access-control-max-age":
      "86400",
  };
}

export async function OPTIONS(
  req:
    Request,
) {
  return new Response(
    null,
    {
      status:
        204,

      headers:
        getCorsHeaders(
          req,
        ),
    },
  );
}

export async function POST(
  req:
    Request,
) {
  try {
    await requireUser(
      req,
    );

    const parsed =
      Body.safeParse(
        await req
          .json()
          .catch(
            () => ({}),
          ),
      );

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            parsed.error
              .flatten(),
        },
        {
          status:
            400,

          headers:
            getCorsHeaders(
              req,
            ),
        },
      );
    }

    const {
      text,
      sourceMode,
      persona,
      voiceId,
      speed,
    } =
      parsed.data;

    const voice =
      voiceId ??
      process.env
        .ARBOR_OPENAI_VOICE;

    if (!voice) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            "ARBOR_OPENAI_VOICE is not configured.",
        },
        {
          status:
            503,

          headers:
            getCorsHeaders(
              req,
            ),
        },
      );
    }

    const result =
      await synthesizeOpenAiTts({
        text,
        voice,
        speed,

        instructions:
          buildVoiceInstructions(
            persona,
          ),
      });

    const audioBody =
      result.audio.buffer.slice(
        result.audio.byteOffset,
        result.audio.byteOffset +
          result.audio.byteLength,
      ) as ArrayBuffer;

    return new Response(
      audioBody,
      {
        status:
          200,

        headers: {
          ...getCorsHeaders(
            req,
          ),

          "content-type":
            result.contentType,

          "cache-control":
            "no-store",

          "x-arbor-persona":
            persona,

          "x-arbor-source-mode":
            sourceMode,

          "x-arbor-tts-boundary":
            "render-only",

          ...(result.requestId
            ? {
                "x-provider-request-id":
                  result.requestId,
              }
            : {}),
        },
      },
    );
  } catch (error) {
    const response =
      routeErrorResponse(
        error,
      );

    for (
      const [
        name,
        value,
      ] of Object.entries(
        getCorsHeaders(
          req,
        ),
      )
    ) {
      response.headers.set(
        name,
        value,
      );
    }

    return response;
  }
}

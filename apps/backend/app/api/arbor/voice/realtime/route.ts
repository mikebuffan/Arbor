import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/requireUser";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  projectId: z.string().uuid(),
  sdp: z.string().min(1).max(200_000),
});

function cors(req: Request) {
  return {
    "access-control-allow-origin": req.headers.get("origin") ?? "*",
    vary: "origin",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers":
      "content-type, authorization, apikey, x-client-info",
    "access-control-max-age": "86400",
  };
}

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: cors(req),
  });
}

export async function POST(req: Request) {
  try {
    const { supabase, userId } = await requireUser(req);

    const parsed = Body.safeParse(
      await req.json().catch(() => ({})),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400, headers: cors(req) },
      );
    }

    const { projectId, sdp } = parsed.data;

    await assertProjectOwnedByUser(
      supabase,
      userId,
      projectId,
    );

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "realtime_unavailable" },
        { status: 503, headers: cors(req) },
      );
    }

    const session = {
      type: "realtime",
      model:
        process.env.ARBOR_REALTIME_MODEL ??
        "gpt-realtime-2",
      output_modalities: ["text"],
      audio: {
        input: {
          transcription: {
            model:
              process.env.ARBOR_TRANSCRIPTION_MODEL ??
              "gpt-transcribe",
          },
          turn_detection: {
            type: "server_vad",
            create_response: false,
            interrupt_response: false,
            prefix_padding_ms: 300,
            silence_duration_ms: 650,
          },
        },
      },
    };

    const form = new FormData();

    form.set(
      "sdp",
      new Blob([sdp], { type: "application/sdp" }),
      "offer.sdp",
    );

    form.set(
      "session",
      new Blob([JSON.stringify(session)], { type: "application/json" }),
      "session.json",
    );

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      20_000,
    );

    try {
      const response = await fetch(
        "https://api.openai.com/v1/realtime/calls",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            accept: "application/sdp",
          },
          body: form,
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: `realtime_http_${response.status}`,
          },
          {
            status: response.status === 429 ? 429 : 502,
            headers: cors(req),
          },
        );
      }

      const answerSdp = await response.text();

      return new Response(answerSdp, {
        status: 200,
        headers: {
          ...cors(req),
          "content-type": "application/sdp",
          "cache-control": "no-store",
          ...(response.headers.get("x-request-id")
            ? {
                "x-provider-request-id":
                  response.headers.get("x-request-id")!,
              }
            : {}),
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const response = routeErrorResponse(error);

    for (const [key, value] of Object.entries(cors(req))) {
      response.headers.set(key, value);
    }

    return response;
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/requireUser";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";

import { loadSubsystemState } from "@/lib/arbor/subsystem/state";
import { buildVoiceInstructions } from "@/lib/arbor/voice/identity";
import { synthesizeOpenAiTts } from "@/lib/arbor/voice/openaiTts";
import { loadCanonicalAssistantTextForTurn } from "@/lib/arbor/voice/canonicalTurn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  projectId: z.string().uuid(),
  turnId: z.string().uuid(),
});

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "access-control-allow-origin": origin,
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
    headers: getCorsHeaders(req),
  });
}

export async function POST(req: Request) {
  try {
    const { supabase, userId } = await requireUser(req);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400, headers: getCorsHeaders(req) },
      );
    }

    const { projectId, turnId } = parsed.data;

    await assertProjectOwnedByUser(supabase, userId, projectId);

    const canonicalText = await loadCanonicalAssistantTextForTurn({
      supabase,
      userId,
      projectId,
      turnId,
    });

    const voiceState = await loadSubsystemState({
      supabase,
      userId,
      projectId,
    });

    const result = await synthesizeOpenAiTts({
      text: canonicalText,
      voice: voiceState.voiceId,
      instructions: buildVoiceInstructions(
        voiceState.activeSubsystem,
        voiceState.acousticCorrections,
      ),
    });

    const audioBody = result.audio.buffer.slice(
      result.audio.byteOffset,
      result.audio.byteOffset + result.audio.byteLength,
    ) as ArrayBuffer;

    return new Response(audioBody, {
      status: 200,
      headers: {
        ...getCorsHeaders(req),
        "content-type": result.contentType,
        "cache-control": "no-store",
        "x-arbor-turn-id": turnId,
        "x-arbor-subsystem": voiceState.activeSubsystem,
        "x-arbor-voice": voiceState.voiceId,
        ...(result.requestId
          ? { "x-provider-request-id": result.requestId }
          : {}),
      },
    });
  } catch (error) {
    const response = routeErrorResponse(error);
    for (const [name, value] of Object.entries(getCorsHeaders(req))) {
      response.headers.set(name, value);
    }
    return response;
  }
}

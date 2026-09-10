import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/requireUser";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";

import { loadSubsystemState } from "@/lib/arbor/subsystem/state";
import { buildVoiceInstructions } from "@/lib/arbor/voice/identity";
import { synthesizeArborSpeech } from "@/lib/arbor/voice/speechPipeline";
import { loadCanonicalAssistantTurnForTurn } from "@/lib/arbor/voice/canonicalTurn";
import { loadRuntimeState } from "@/lib/arbor/runtime/runtimeStateStore";
import { acousticCorrections } from "@/lib/arbor/runtime/corrections";
import { ArborTimeline } from "@/lib/arbor/timeline/runTimeline";
import { SupabaseTimelineStore } from "@/lib/arbor/timeline/supabaseStore";

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

    const canonicalTurn =
      await loadCanonicalAssistantTurnForTurn({
        supabase,
        userId,
        projectId,
        turnId,
      });

    const canonicalText =
      canonicalTurn.text;

    const voiceState = await loadSubsystemState({
      supabase,
      userId,
      projectId,
    });

    const conversationRuntime =
      await loadRuntimeState({
        supabase,
        userId,
        projectId,
        conversationId:
          canonicalTurn.conversationId,
      });

    const runtimeAcousticCorrections =
      conversationRuntime
        ? acousticCorrections(
            conversationRuntime.corrections,
          )
        : [];

    const voiceCorrections =
      Array.from(
        new Set([
          ...voiceState.acousticCorrections,
          ...runtimeAcousticCorrections,
        ]),
      );

    const timeline = await ArborTimeline.create(
      new SupabaseTimelineStore(supabase),
      {
        userId,
        projectId,
        turnId,
        subsystem: voiceState.activeSubsystem,
        channel: "voice",
      },
    );

    await timeline.record(
      "render",
      "adapter_selected",
      {
        adapter: "voice",
        voiceId: voiceState.voiceId,
      },
    );

    const result = await synthesizeArborSpeech({
      text: canonicalText,
      voice: voiceState.voiceId,
      instructions: buildVoiceInstructions(
        voiceState.activeSubsystem,
        voiceCorrections,
      ),
    });

    await timeline.record(
      "render",
      "render_completed",
      {
        adapter: "voice",
        providerRequestIds: result.requestIds,
        chunks: result.chunks,
        bytes: result.audio.byteLength,
      },
    );

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
        "x-arbor-voice-chunks": String(result.chunks),
        ...(result.requestIds.length
          ? { "x-provider-request-id": result.requestIds.join(",") }
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

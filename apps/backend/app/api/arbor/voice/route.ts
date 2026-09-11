import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/requireUser";
import { assertProjectOwnedByUser } from "@/lib/auth/ownership";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";

import { VoiceAdapter } from "@/lib/arbor/adapters/voice";
import type { CanonicalArborOutput } from "@/lib/arbor/runtime/arborRuntime";
import { loadSubsystemState } from "@/lib/arbor/subsystem/state";
import {
  renderArborThroughVoiceGate,
} from "@/lib/arbor/voice/acousticProjection";
import {
  synthesizeArborSpeech,
  type ArborSpeechResult,
} from "@/lib/arbor/voice/speechPipeline";
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

    const voiceState = await loadSubsystemState({
      supabase,
      userId,
      projectId,
    });

    const conversationRuntime = await loadRuntimeState({
      supabase,
      userId,
      projectId,
      conversationId: canonicalTurn.conversationId,
    });

    const runtimeAcousticCorrections = conversationRuntime
      ? acousticCorrections(conversationRuntime.corrections)
      : [];

    const voiceCorrections = Array.from(
      new Set([
        ...voiceState.acousticCorrections,
        ...runtimeAcousticCorrections,
      ]),
    );

    const acousticGate = renderArborThroughVoiceGate(
      canonicalTurn.text,
      voiceState.activeSubsystem,
      voiceCorrections,
    );

    const canonical: CanonicalArborOutput = {
      text: acousticGate.text,
      activeSubsystem: voiceState.activeSubsystem,
      channel: "voice",
      turnId,
    };

    const voiceAdapter = new VoiceAdapter<ArborSpeechResult>(
      {
        synthesize: ({ text, voiceId, instructions: voiceInstructions }) =>
          synthesizeArborSpeech({
            text,
            voice: voiceId,
            instructions: voiceInstructions,
            speed: acousticGate.speed,
          }),
      },
      {
        voiceId: voiceState.voiceId,
        instructions: acousticGate.instructions,
      },
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
        canonical: true,
        voiceId: voiceState.voiceId,
        speechSpeed: acousticGate.speed,
      },
    );

    const result = await voiceAdapter.render(canonical);

    await timeline.record(
      "render",
      "render_completed",
      {
        adapter: "voice",
        canonical: true,
        providerRequestIds: result.requestIds,
        chunks: result.chunks,
        bytes: result.audio.byteLength,
        speechSpeed: acousticGate.speed,
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
        "x-arbor-voice-speed": String(acousticGate.speed),
        "x-arbor-canonical-adapter": "voice",
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

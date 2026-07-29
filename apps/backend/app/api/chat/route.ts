import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/requireUser";
import {
  assertConversationOwnedByUser,
  assertProjectOwnedByUser,
} from "@/lib/auth/ownership";
import { routeErrorResponse } from "@/lib/auth/routeAuthorization";
import { openAIChat } from "@/lib/providers/openai";
import { buildPromptContext } from "@/lib/prompt/buildPromptContext";
import { extractMemoryFromText } from "@/lib/memory/extractor";
import { upsertMemoryItems, reinforceMemoryUse } from "@/lib/memory/store";
import { postcheckResponse } from "@/lib/safety/postcheck";
import { logMemoryEvent } from "@/lib/memory/logger";
import { guardAssistantText } from "@/lib/guards/responseLanguageGuard";
import { evaluateDecisionContext } from "@/lib/governance/evaluateDecisionContext";
import { realWorldSafetyAddendum } from "@/lib/governance/realWorldSafetyAddendum";
import { logDecisionOutcome } from "@/lib/safety/decisionOutcome";
import { promoteIdentityAnchors } from "@/lib/memory/promoteIdentityAnchors";

import { buildProofSnapshot } from "@/lib/arbor/ProofSnapshot";
import { buildTelemetry } from "@/lib/arbor/telemetry/buildTelemetry";
import { getOrCreateOpenEpisode } from "@/lib/arbor/episodes/getOrCreateOpenEpisode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { assertProjectOwnedByUser };

type Msg = { role: "user" | "assistant" | "system"; content: string };

const NullableUuid = z.preprocess(
  (v) => (v === null || v === "" ? undefined : v),
  z.string().uuid().optional()
);

const Body = z.object({
  projectId: NullableUuid,
  conversationId: NullableUuid,
  userText: z.string().min(1),
});

export function buildChatSuccessResponse(params: {
  projectId: string;
  conversationId: string;
  assistantText: string;
  flagged?: boolean;
}) {
  return {
    ok: true as const,
    projectId: params.projectId,
    conversationId: params.conversationId,
    assistantText: params.assistantText,
    ...(params.flagged ? { flagged: true as const } : {}),
  };
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";

  return {
    "access-control-allow-origin": origin,
    "vary": "origin",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization, apikey, x-client-info",
    "access-control-max-age": "86400",
  };
}

function runBg(label: string, fn: () => Promise<unknown>) {
  void fn().catch(() => console.warn(`[bg:${label}] failed`));
}

function assistantTextFromResponse(response: unknown): string {
  if (!response || typeof response !== "object" || !("choices" in response)) {
    return "";
  }

  const choices = (response as {
    choices?: Array<{ message?: { content?: string | null } }>;
  }).choices;
  return choices?.[0]?.message?.content ?? "";
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

async function getOrCreateDefaultProjectId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data: existing, error: e1 } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Default Project")
    .maybeSingle();

  if (e1) throw e1;
  if (existing?.id) return existing.id as string;

  const { data: created, error: e2 } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: "Default Project",
      persona_id: "arbor",
      framework_version: "v1",
    })
    .select("id")
    .single();

  if (e2) throw e2;
  return created.id as string;
}

async function getOrCreateConversation(params: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  conversationId?: string;
}) {
  const { supabase, userId, projectId, conversationId } = params;

  if (conversationId) {
    await assertConversationOwnedByUser({
      supabase,
      userId,
      conversationId,
      projectId,
    });
    return conversationId;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      project_id: projectId,
      title: null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function loadRecentMessages(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  limit = 20
): Promise<Msg[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("role,content,created_at,deleted_at,expires_at")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  const messages = (data ?? []) as Array<{
    role: Msg["role"];
    content: string;
  }>;
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

async function cleanupExpiredMessagesBestEffort(
  supabase: SupabaseClient,
  userId: string,
) {
  await supabase
    .from("messages")
    .delete()
    .eq("user_id", userId)
    .lt("expires_at", new Date().toISOString())
    .not("expires_at", "is", null);
}

export async function POST(req: Request) {
  const t0 = performance.now(); 

  try {
    const { supabase, userId } = await requireUser(req);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    const { projectId: maybeProjectId, conversationId, userText } = parsed.data;
    await cleanupExpiredMessagesBestEffort(supabase, userId);
    if (maybeProjectId) {
      await assertProjectOwnedByUser(supabase, userId, maybeProjectId);
    }
    const projectId = maybeProjectId ?? (await getOrCreateDefaultProjectId(supabase, userId));

    const convoId = await getOrCreateConversation({
      supabase,
      userId,
      projectId,
      conversationId,
    });

    const episodeId = await getOrCreateOpenEpisode({
      supabase,
      userId,
      projectId,
      threadId: convoId,
    });

    await supabase.from("messages").insert({
      project_id: projectId,
      conversation_id: convoId,
      episode_id: episodeId,
      user_id: userId,
      role: "user",
      content: userText,
    });

    const decisionContext = evaluateDecisionContext({ userText });
    const safety = realWorldSafetyAddendum(decisionContext);

    const historyPromise = loadRecentMessages(supabase, userId, convoId, 20);
    const promptContextPromise = buildPromptContext({
      supabase,
      authedUserId: userId,
      projectId,
      conversationId: convoId,
      latestUserText: userText,
      safety,
    });
    const [history, promptContext] = await Promise.all([
      historyPromise,
      promptContextPromise,
    ]);
    const { systemPrompt, injectedMemoryItems: selectedMemoryItems } = promptContext;
    const injectedMemoryKeys = selectedMemoryItems
      .map((item) => item.key)
      .filter(Boolean);

    const memoryDebugTop = selectedMemoryItems.map((item) => ({
      id: item.id,
      key: item.key,
      pinned: item.pinned,
      locked: item.locked,
      importance: item.importance,
      confidence: item.confidence,
      similarity: item.similarity ?? null,
      tier: item.tier,
      scope: item.scope,
    }));

    const messagesForModel: Msg[] = [
      { role: "system", content: systemPrompt },
      ...history,
    ];

    const aiResponse = await openAIChat({
      model: process.env.OPENAI_CHAT_MODEL ?? "gpt-5",
      messages: messagesForModel,
    });

    let assistantText = assistantTextFromResponse(aiResponse);
    assistantText = guardAssistantText(assistantText).text;

    if (safety?.assistantPreface) {
      assistantText = `${safety.assistantPreface}\n\n${assistantText}`;
    }

    const postcheck = await postcheckResponse({
      authedUserId: userId,
      projectId,
      assistantText,
    });

    if (!postcheck.approved) {
      return NextResponse.json(
        buildChatSuccessResponse({
          projectId,
          conversationId: convoId,
          assistantText: postcheck.replacement ?? assistantText,
          flagged: true,
        }),
        { status: 200, headers: getCorsHeaders(req) }
      );
    }

    const traceId = crypto.randomUUID();

    const proofSnapshot = {
      ...buildProofSnapshot({
        anchors: [],
        memoryItems: selectedMemoryItems.map((item) => ({ id: item.id })),
      }),
      memory_debug: memoryDebugTop,
    };

    const retrievalLatencyMs = Math.round(performance.now() - t0);

    runBg("telemetry", async () => {
      await buildTelemetry(
        supabase,
        {
          traceId,
          userId,
          projectId,
          threadId: convoId,
          episodeId,
          retrievalLatencyMs,
          logicGatesHit: [],
        },
        proofSnapshot
      );
    });

    runBg("memory_pipeline", async () => {
      const extracted = await extractMemoryFromText({ userText, assistantText });

      await promoteIdentityAnchors({
        supabase,
        authedUserId: userId,
        projectId,
        userText,
        extracted,
      });

      await upsertMemoryItems(userId, extracted, projectId, supabase);
      await reinforceMemoryUse(
        userId,
        injectedMemoryKeys,
        projectId,
        supabase,
      );

      await logMemoryEvent("chat_completed", {
        userId,
        projectId,
        conversationId: convoId,
      });
    });

    runBg("conversation_update", async () => {
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convoId)
        .eq("user_id", userId);
    });

    runBg("decision_outcome", async () => {
      await logDecisionOutcome({
        userId,
        projectId,
        conversationId: convoId,
        severityScore: decisionContext?.severityScore ?? 0,
        riskBand: decisionContext?.riskBand ?? null,
        emotionalIntensity: decisionContext?.emotionalIntensity ?? null,
        flags: decisionContext?.flags ?? {},
        actionTaken: safety?.assistantPreface ? "safety_preface" : "none",
        model: process.env.OPENAI_CHAT_MODEL ?? null,
        postcheckApproved: true,
      });
    });

    /* =====================================================
      3.10.5 DEV-ONLY — REMOVE BEFORE SHIPPING
      ===================================================== */
    const response: ReturnType<typeof buildChatSuccessResponse> & {
      _telemetry?: Record<string, unknown>;
    } = buildChatSuccessResponse({
      projectId,
      conversationId: convoId,
      assistantText,
    });

    if (process.env.NODE_ENV === "development") {
      response._telemetry = {
        traceId,
        injectedAnchorIds: proofSnapshot.injected_anchor_ids,
        injectedMemoryItemIds: proofSnapshot.injected_memory_item_ids,
        safetyTier: proofSnapshot.safety_tier,
        memoryDebugTop, 
      };
    }

    return NextResponse.json(response, {
      status: 200,
      headers: getCorsHeaders(req),
    });

  } catch (error: unknown) {
    const response = routeErrorResponse(error);
    for (const [name, value] of Object.entries(getCorsHeaders(req))) {
      response.headers.set(name, value);
    }
    return response;
  }
}

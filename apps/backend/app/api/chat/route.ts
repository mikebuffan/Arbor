import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
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
import { getMemoryContext, type RetrievedMemoryItem } from "@/lib/memory/retrieval";

import { buildProofSnapshot } from "@/lib/arbor/ProofSnapshot";
import { buildTelemetry } from "@/lib/arbor/telemetry/buildTelemetry";
import { getOrCreateOpenEpisode } from "@/lib/arbor/episodes/getOrCreateOpenEpisode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function runBg(label: string, fn: () => Promise<any>) {
  void fn().catch((e) => console.warn(`[bg:${label}]`, e));
}

function rankRetrievedMemories(items: RetrievedMemoryItem[]) {
  return [...items].sort((a, b) => {
    const pinnedDelta = Number(b.pinned) - Number(a.pinned);
    if (pinnedDelta !== 0) return pinnedDelta;

    const lockedDelta = Number(b.locked) - Number(a.locked);
    if (lockedDelta !== 0) return lockedDelta;

    const importanceDelta = (b.importance ?? 0) - (a.importance ?? 0);
    if (importanceDelta !== 0) return importanceDelta;

    const confidenceDelta = (b.confidence ?? 0) - (a.confidence ?? 0);
    if (confidenceDelta !== 0) return confidenceDelta;

    return (b.similarity ?? 0) - (a.similarity ?? 0);
  });
} 

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

async function getOrCreateDefaultProjectId(supabase: any, userId: string): Promise<string> {
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
  supabase: any;
  userId: string;
  projectId: string;
  conversationId?: string;
}) {
  const { supabase, userId, projectId, conversationId } = params;

  if (conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .single();

    if (error) throw error;
    return data.id as string;
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
  supabase: any,
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
  return (data ?? []).map((m: any) => ({ role: m.role, content: m.content }));
}

async function cleanupExpiredMessagesBestEffort(supabase: any, userId: string) {
  await supabase
    .from("messages")
    .delete()
    .eq("user_id", userId)
    .lt("expires_at", new Date().toISOString())
    .not("expires_at", "is", null);
}

export async function POST(req: Request) {
  const t0 = performance.now(); 

  function hoursSince(d?: string | Date | null) {
    if (!d) return Infinity;
    const t = typeof d === "string" ? Date.parse(d) : d.getTime();
    if (!Number.isFinite(t)) return Infinity;
    return (Date.now() - t) / 36e5;
  }

  function clamp01(x: number) {
    return Math.max(0, Math.min(1, x));
  }

  function stabilityScore(row: any) {
    const sim = typeof row.similarity === "number" ? row.similarity : 0;
    const imp = typeof row.importance === "number" ? row.importance : 5;

    const impN = clamp01((imp - 1) / 9);

    const pinnedBoost = row.pinned ? 0.20 : 0;
    const lockedBoost = row.locked ? 0.10 : 0;

    const hrs = Math.min(hoursSince(row.last_seen_at ?? row.created_at), 24 * 14);
    const recency = Math.exp(-hrs / 72); 

    const score =
      (0.60 * sim) +
      (0.20 * impN) +
      (0.15 * recency) +
      pinnedBoost +
      lockedBoost;

    return score;
  }

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
    const systemPromptPromise = buildPromptContext({
      authedUserId: userId,
      projectId,
      conversationId: convoId,
      latestUserText: userText,
      safety,
    });
    const memoryContextPromise = getMemoryContext({
      authedUserId: userId,
      projectId,
      latestUserText: userText,
      useVectorSearch: true,
    });

    const [history, systemPrompt, memoryContext] = await Promise.all([
      historyPromise,
      systemPromptPromise,
      memoryContextPromise,
    ]);

    console.log("[chat route] memoryContext received", {
      core: memoryContext.core.map((i) => i.key),
      normal: memoryContext.normal.map((i) => i.key),
      sensitive: memoryContext.sensitive.map((i) => i.key),
      keysUsed: memoryContext.keysUsed,
    });

    const selectedMemoryItems = rankRetrievedMemories([
      ...memoryContext.core,
      ...memoryContext.normal,
      ...memoryContext.sensitive,
    ]).slice(0, 12);

    console.log("[chat route] selectedMemoryItems", selectedMemoryItems.map((i) => ({
      id: i.id,
      key: i.key,
      tier: i.tier,
      similarity: i.similarity ?? null,
      pinned: i.pinned,
      locked: i.locked,
    })));

    const injectedMemoryItemIds = selectedMemoryItems.map((item) => item.id);
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

    let assistantText = (aiResponse as any)?.choices?.[0]?.message?.content ?? "";
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
        { ok: true, assistantText: postcheck.replacement, flagged: true },
        { status: 200, headers: getCorsHeaders(req) }
      );
    }

    const traceId = crypto.randomUUID();

    const proofSnapshot = buildProofSnapshot({
      anchors: [],
      memoryItems: selectedMemoryItems.map((item) => ({ id: item.id })),
    });

    (proofSnapshot as any).memory_debug = memoryDebugTop;

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
        authedUserId: userId,
        projectId,
        userText,
        extracted,
      });

      await upsertMemoryItems(userId, extracted, projectId);
      await reinforceMemoryUse(userId, injectedMemoryKeys, projectId);

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
    const response: any = {
      ok: true,
      projectId,
      conversationId: convoId,
      assistantText,
    };

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

  } catch (err: any) {
    console.error("chat route error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "server_error" },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}

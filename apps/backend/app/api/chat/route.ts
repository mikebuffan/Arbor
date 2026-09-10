import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/requireUser";
import {
  assertConversationOwnedByUser,
  assertProjectOwnedByUser,
} from "@/lib/auth/ownership";
import {
  RouteAccessError,
  routeErrorResponse,
} from "@/lib/auth/routeAuthorization";
import { buildPromptContext } from "@/lib/prompt/buildPromptContext";
import { runOpenAIAgencyAgent } from "@/lib/arbor/agency/openaiAgent";
import { AgencyToolRegistry } from "@/lib/arbor/agency/tools";
import {
  beginAgencySession,
  blockAgencySession,
  completeAgencySession,
  recordAgencyProgress,
} from "@/lib/arbor/agency/session";
import { ArborTimeline } from "@/lib/arbor/timeline/runTimeline";
import { SupabaseTimelineStore } from "@/lib/arbor/timeline/supabaseStore";
import { extractMemoryFromText } from "@/lib/memory/extractor";
import { reinforceMemoryUse } from "@/lib/memory/store";
import {
  classifyMemoryTurn,
  persistClassifiedMemoryTurn,
} from "@/lib/memory/correctionResolution";
import { postcheckResponse } from "@/lib/safety/postcheck";
import { writeDurableChatCompletedEvent } from "@/lib/memory/durableEvents";
import { evaluateDecisionContext } from "@/lib/governance/evaluateDecisionContext";
import { realWorldSafetyAddendum } from "@/lib/governance/realWorldSafetyAddendum";
import { logDecisionOutcome } from "@/lib/safety/decisionOutcome";
import { promoteIdentityAnchors } from "@/lib/memory/promoteIdentityAnchors";
import {
  claimUserTurn,
  createSupabaseChatTurnStore,
  finalizeAndPersistAssistantTurn,
  getCompletedAssistantTurn,
  resolveConversationForTurn,
} from "@/lib/chat/turnPersistence";

import { buildProofSnapshot } from "@/lib/arbor/ProofSnapshot";
import { buildTelemetry } from "@/lib/arbor/telemetry/buildTelemetry";
import { getOrCreateOpenEpisode } from "@/lib/arbor/episodes/getOrCreateOpenEpisode";
import { scheduleChatPostResponseWork } from "@/lib/chat/postResponseScheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { assertProjectOwnedByUser };

type Msg = { role: "user" | "assistant" | "system"; content: string };

const NullableUuid = z.preprocess(
  (v) => (v === null || v === "" ? undefined : v),
  z.string().uuid().optional(),
);

const Body = z.object({
  projectId: NullableUuid,
  conversationId: NullableUuid,
  turnId: z.string().uuid(),
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
    vary: "origin",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers":
      "content-type, authorization, apikey, x-client-info",
    "access-control-max-age": "86400",
  };
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

export async function loadRecentMessages(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  limit = 20,
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
        { status: 400, headers: getCorsHeaders(req) },
      );
    }

    const {
      projectId: maybeProjectId,
      conversationId,
      turnId,
      userText,
    } = parsed.data;

    await cleanupExpiredMessagesBestEffort(supabase, userId);
    if (maybeProjectId) {
      await assertProjectOwnedByUser(supabase, userId, maybeProjectId);
    }
    const projectId =
      maybeProjectId ?? (await getOrCreateDefaultProjectId(supabase, userId));

    const turnStore = createSupabaseChatTurnStore(supabase);
    const resolvedTurn = await resolveConversationForTurn({
      store: turnStore,
      userId,
      projectId,
      turnId,
      userText,
      requestedConversationId: conversationId,
      assertRequestedConversationOwned: async (requestedConversationId) => {
        await assertConversationOwnedByUser({
          supabase,
          userId,
          conversationId: requestedConversationId,
          projectId,
        });
      },
    });
    const convoId = resolvedTurn.conversationId;

    const episodeId = await getOrCreateOpenEpisode({
      supabase,
      userId,
      projectId,
      threadId: convoId,
    });

    await claimUserTurn({
      store: turnStore,
      messageId: resolvedTurn.ids.userMessageId,
      userId,
      projectId,
      conversationId: convoId,
      episodeId,
      userText,
    });

    const completedTurn = await getCompletedAssistantTurn({
      store: turnStore,
      messageId: resolvedTurn.ids.assistantMessageId,
      userId,
      projectId,
      conversationId: convoId,
    });
    if (completedTurn) {
      return NextResponse.json(
        buildChatSuccessResponse({
          projectId,
          conversationId: convoId,
          assistantText: completedTurn.content,
        }),
        { status: 200, headers: getCorsHeaders(req) },
      );
    }

    let agencyState = await beginAgencySession({
      supabase,
      userId,
      projectId,
      userText,
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

    const {
      systemPrompt,
      injectedMemoryItems: selectedMemoryItems,
      activeSubsystem,
    } = promptContext;

    const timeline = await ArborTimeline.create(
      new SupabaseTimelineStore(supabase),
      {
        userId,
        projectId,
        conversationId: convoId,
        turnId,
        subsystem: activeSubsystem,
        channel: "text",
      },
    );

    await timeline.record("input", "turn_started", {
      goal: agencyState.goal,
    });

    await timeline.record("retrieve", "state_loaded", {
      agencyStatus: agencyState.status,
      unresolvedWork: agencyState.unresolvedWork,
    });

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

    const agencyTools = new AgencyToolRegistry();

    const agentResult = await runOpenAIAgencyAgent({
      instructions: systemPrompt,
      messages: history
        .filter(
          (
            message,
          ): message is Msg & { role: "user" | "assistant" } =>
            message.role === "user" || message.role === "assistant",
        )
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
      tools: agencyTools,
      context: {
        userId,
        projectId,
        conversationId: convoId,
        turnId,
      },
      allowWebResearch: process.env.ARBOR_ENABLE_WEB_RESEARCH !== "false",
      hooks: {
        async onRoundStart(round) {
          agencyState = await recordAgencyProgress({
            supabase,
            userId,
            projectId,
            agency: agencyState,
            step: Math.max(agencyState.currentStep + 1, round + 1),
          });

          await timeline.record("decide", "goal_resolved", {
            round,
            goal: agencyState.goal,
            unresolvedWork: agencyState.unresolvedWork,
          });
        },
        async onToolSelected({ name, arguments: args }) {
          agencyState = await recordAgencyProgress({
            supabase,
            userId,
            projectId,
            agency: agencyState,
            step: agencyState.currentStep,
            unresolvedWork: [`execute capability: ${name}`],
          });

          await timeline.record(
            "decide",
            "action_selected",
            { capability: name, arguments: args },
            name,
          );

          await timeline.record(
            "act",
            "action_started",
            { capability: name },
            name,
          );
        },
        async onToolResult({ name }) {
          agencyState = await recordAgencyProgress({
            supabase,
            userId,
            projectId,
            agency: agencyState,
            step: agencyState.currentStep,
            unresolvedWork: [],
          });

          await timeline.record(
            "observe",
            "action_completed",
            { capability: name },
            name,
          );
        },
        async onBoundary({ name, reason }) {
          agencyState = await blockAgencySession({
            supabase,
            userId,
            projectId,
            agency: agencyState,
            blocker: reason,
            unresolvedWork: [`complete boundary action: ${name}`],
          });

          await timeline.record(
            "blocked",
            "turn_blocked",
            {
              capability: name,
              reason,
              unresolvedWork: agencyState.unresolvedWork,
            },
            name,
          );
        },
      },
    });

    if (agentResult.status === "blocked") {
      throw new RouteAccessError(409, "agency_boundary");
    }

    const deterministicMemoryTurn = classifyMemoryTurn({
      userText,
      extractedItems: [],
    });
    let explicitCorrectionHandledSynchronously = false;

    const finalAssistant = await finalizeAndPersistAssistantTurn({
      store: turnStore,
      messageId: resolvedTurn.ids.assistantMessageId,
      userId,
      projectId,
      conversationId: convoId,
      episodeId,
      rawAssistantText: agentResult.text,
      assistantPreface: safety?.assistantPreface ?? undefined,
      postcheck: (assistantText) =>
        postcheckResponse({
          authedUserId: userId,
          projectId,
          assistantText,
        }),
      beforePersist:
        deterministicMemoryTurn.kind === "correction"
          ? async () => {
              const result = await persistClassifiedMemoryTurn({
                supabase,
                userId,
                projectId,
                classified: deterministicMemoryTurn,
                injectedMemoryIds: selectedMemoryItems.map((item) => item.id),
              });
              if (
                result.kind !== "correction" ||
                (result.resolution.status !== "resolved" &&
                  result.resolution.status !== "already_applied")
              ) {
                throw new RouteAccessError(409, "correction_unresolved");
              }
              explicitCorrectionHandledSynchronously = true;
            }
          : undefined,
    });

    agencyState = await completeAgencySession({
      supabase,
      userId,
      projectId,
      agency: agencyState,
      verified: !finalAssistant.flagged,
    });

    await timeline.record(
      "generate",
      "canonical_response_generated",
      {
        characterCount: finalAssistant.assistantText.length,
        flagged: finalAssistant.flagged,
      },
    );

    await timeline.record("persist", "state_persisted", {
      agencyStatus: agencyState.status,
    });

    await timeline.record("complete", "turn_completed");

    const assistantText = finalAssistant.assistantText;
    const traceId = crypto.randomUUID();

    const proofSnapshot = {
      ...buildProofSnapshot({
        anchors: [],
        memoryItems: selectedMemoryItems.map((item) => ({ id: item.id })),
      }),
      memory_debug: memoryDebugTop,
    };

    const retrievalLatencyMs = Math.round(performance.now() - t0);

    scheduleChatPostResponseWork({
      newlyCreated: finalAssistant.created,
      operations: {
        telemetry: async () => {
          await buildTelemetry(
            {
              traceId,
              userId,
              projectId,
              threadId: convoId,
              episodeId,
              retrievalLatencyMs,
              logicGatesHit: [],
            },
            proofSnapshot,
          );
        },

        memory_pipeline: async () => {
          const extracted = await extractMemoryFromText({
            userText,
            assistantText,
          });
          const classified = classifyMemoryTurn({
            userText,
            extractedItems: extracted,
          });

          await promoteIdentityAnchors({
            supabase,
            authedUserId: userId,
            projectId,
            userText,
            extracted:
              classified.kind === "assertion" ? classified.items : [],
          });

          if (!explicitCorrectionHandledSynchronously) {
            await persistClassifiedMemoryTurn({
              supabase,
              userId,
              projectId,
              classified,
              injectedMemoryIds: selectedMemoryItems.map((item) => item.id),
            });
          }

          if (classified.kind === "assertion") {
            await reinforceMemoryUse(
              userId,
              injectedMemoryKeys,
              projectId,
              supabase,
            );
          }

          await writeDurableChatCompletedEvent({
            supabase,
            userId,
            projectId,
            conversationId: convoId,
          });
        },

        conversation_update: async () => {
          await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", convoId)
            .eq("user_id", userId);
        },

        decision_outcome: async () => {
          await logDecisionOutcome({
            userId,
            projectId,
            conversationId: convoId,
            severityScore: decisionContext?.severityScore ?? 0,
            riskBand: decisionContext?.riskBand ?? null,
            emotionalIntensity: decisionContext?.emotionalIntensity ?? null,
            flags: decisionContext?.flags ?? {},
            actionTaken: safety?.assistantPreface ? "safety_preface" : "none",
            model:
              process.env.OPENAI_AGENCY_MODEL ??
              process.env.OPENAI_MODEL ??
              "gpt-5",
            postcheckApproved: !finalAssistant.flagged,
          });
        },
      },
    });

    const response: ReturnType<typeof buildChatSuccessResponse> & {
      _telemetry?: Record<string, unknown>;
    } = buildChatSuccessResponse({
      projectId,
      conversationId: convoId,
      assistantText,
      flagged: finalAssistant.flagged,
    });

    if (process.env.NODE_ENV === "development") {
      response._telemetry = {
        traceId,
        injectedAnchorIds: proofSnapshot.injected_anchor_ids,
        injectedMemoryItemIds: proofSnapshot.injected_memory_item_ids,
        safetyTier: proofSnapshot.safety_tier,
        memoryDebugTop,
        agentToolCalls: agentResult.toolCalls,
        agencyStatus: agencyState.status,
        agencyStep: agencyState.currentStep,
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

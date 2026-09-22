import { isArkChatExecutionEnabled } from "@/lib/ark/activation";
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
import { buildArborAgencyTools } from "@/lib/arbor/agency/arborTools";
import {
  claimAgencyOperation,
  completeAgencyOperation,
} from "@/lib/arbor/agency/idempotency";
import { buildArkAgencyExecutionDelegate } from "@/lib/ark/agencyExecutionDelegate";
import { arkAgencyPlanId } from "@/lib/ark/agencyPlanId";
import { toolNeedsUserBoundary } from "@/lib/arbor/agency/tools";
import {
  beginAgencySession,
  blockAgencySession,
  checkpointAgencySession,
  completeAgencySession,
  recordAgencyProgress,
} from "@/lib/arbor/agency/session";
import { ArborTimeline } from "@/lib/arbor/timeline/runTimeline";
import { SupabaseTimelineStore } from "@/lib/arbor/timeline/supabaseStore";
import { extractMemoryFromText } from "@/lib/memory/extractor";
import { ingestMemorySignals } from "@/lib/memory/ingestSignals";
import { consolidateMemoryCandidates } from "@/lib/memory/consolidateCandidates";
import { reinforceMemoryCandidate } from "@/lib/memory/reinforceCandidate";
import { promoteEligibleMemoryCandidates } from "@/lib/memory/promoteCandidates";
import {
  applyMemoryPromotion,
  loadRelatedMemoryCounts,
  scoreMemoryPromotionBatch,
} from "@/lib/memory/memoryPromotion";
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
import {
  beginRuntimeSession,
  updateRuntimeSession,
} from "@/lib/arbor/runtime/runtimeSession";
import {
  createCorrection,
  detectCorrectionKind,
} from "@/lib/arbor/runtime/corrections";
import {
  promoteRepeatedBehaviorCorrections,
} from "@/lib/arbor/runtime/correctionPromotion";
import {
  beginSelfUpdate,
  decideSelfUpdate,
  recordSelfUpdateVerification,
} from "@/lib/arbor/agency/updateLifecycle";
import {
  retainStrategy,
} from "@/lib/arbor/agency/strategyRetention";
import { buildTelemetry } from "@/lib/arbor/telemetry/buildTelemetry";
import { getOrCreateOpenEpisode } from "@/lib/arbor/episodes/getOrCreateOpenEpisode";
import { scheduleChatPostResponseWork } from "@/lib/chat/postResponseScheduler";
import { summarizePriorOpenEpisodes } from "@/lib/arbor/episodes/maintainEpisodes";
import { detectTestMode } from "@/lib/runtime/testModeDetection";
import { hasExplicitDurableAuthorization } from "@/lib/memory/durableAuthorization";

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
  interactionMode: z.enum(["text", "voice"]).default("text"),
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
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  const messages = (data ?? []) as Array<{
    role: Msg["role"];
    content: string;
  }>;
  return messages
    .reverse()
    .map((message) => ({
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
      interactionMode,
    } = parsed.data;

    const memoryTestMode = detectTestMode(userText);
    const durableLearningAuthorized = hasExplicitDurableAuthorization(userText);

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

    // Arbor v1 automatic-learning signal ingest. This is deliberately
    // best-effort: memory learning may fail without taking chat down.
    await ingestMemorySignals({
      projectId,
      userId,
      threadId: convoId,
      messageId: resolvedTurn.ids.userMessageId,
      text: userText,
    }).catch((error) => {
      console.warn("[memory:signals] ingest failed", {
        projectId,
        conversationId: convoId,
        error:
          error instanceof Error
            ? error.message
            : "unknown",
      });
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
      conversationId: convoId,
      userText,
    });

    const decisionContext = evaluateDecisionContext({ userText });
    const safety = realWorldSafetyAddendum(decisionContext);

    // Capture corrections before prompt construction so they govern this
    // generation, not merely the next turn.
    const detectedRuntimeCorrectionKind =
      detectCorrectionKind(userText);
    const runtimeCorrections =
      detectedRuntimeCorrectionKind
        ? [
            createCorrection({
              value: userText,
              source: interactionMode,
              observedAt: new Date().toISOString(),
              kind: detectedRuntimeCorrectionKind,
            }),
          ]
        : [];

    const historyPromise = loadRecentMessages(supabase, userId, convoId, 20);
    const promptContextPromise = buildPromptContext({
      supabase,
      authedUserId: userId,
      projectId,
      conversationId: convoId,
      latestUserText: userText,
      safety,
      interactionMode,
      hostSessionId: turnId,
      currentGoal: agencyState.goal,
      agency: agencyState,
      incomingCorrections: runtimeCorrections,
      attachRuntimeBeforeProjection: true,
    });

    const [history, promptContext] = await Promise.all([
      historyPromise,
      promptContextPromise,
    ]);

    const {
      systemPrompt,
      injectedMemoryItems: selectedMemoryItems,
      injectedCandidateIds,
      activeSubsystem,
      behaviorProof,
      behaviorGuardRequirements,
      runtimeSession: promptRuntimeSession,
    } = promptContext;

    // Compatibility fallback for older/custom prompt builders. Production
    // buildPromptContext returns the pre-inference attached runtime.
    let runtimeSession =
      promptRuntimeSession ??
      await beginRuntimeSession({
        supabase,
        userId,
        projectId,
        conversationId: convoId,
        channel: interactionMode,
        activeSubsystem,
        currentGoal: agencyState.goal,
        lastMeaningfulUserTurn: userText,
        agency: agencyState,
        corrections: runtimeCorrections,
        behaviorProof,
        now: new Date().toISOString(),
      });

    // Complete the pre-inference attachment with the freshly built behavior
    // proof. This state is canonical before the model is invoked.
    runtimeSession = await updateRuntimeSession({
      supabase,
      state: runtimeSession,
      activeSubsystem,
      channel: interactionMode,
      currentGoal: agencyState.goal,
      lastMeaningfulUserTurn: userText,
      agency: agencyState,
      corrections: runtimeCorrections,
      behaviorProof,
      now: new Date().toISOString(),
    });

    let pendingSelfUpdate =
      runtimeSession.pendingSelfUpdate;

    const protectedCorrections =
      runtimeSession.corrections
        .filter((correction) =>
          correction.protected,
        )
        .map((correction) =>
          correction.value,
        );

    const timeline = await ArborTimeline.create(
      new SupabaseTimelineStore(supabase),
      {
        userId,
        projectId,
        conversationId: convoId,
        turnId,
        subsystem: activeSubsystem,
        channel: interactionMode,
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

    const agencyTools = buildArborAgencyTools({ supabase });
    const arkExecutionEnabled = isArkChatExecutionEnabled({
      ARBOR_ARK_ENABLE_LIVE_EXECUTION: process.env.ARBOR_ARK_ENABLE_LIVE_EXECUTION,
      ARBOR_ENABLE_ARK_EXECUTION: process.env.ARBOR_ENABLE_ARK_EXECUTION,
      ARBOR_ENABLE_ARK_CHAT_EXECUTION: process.env.ARBOR_ENABLE_ARK_CHAT_EXECUTION,
    });

    const arkExecutionDelegate = arkExecutionEnabled
      ? buildArkAgencyExecutionDelegate({
          toolSupabase: supabase,
          goal: agencyState.goal,
          canDispatch: ({ capability }) => {
            const execution = agencyState.objective?.execution;
            if (!execution) return { allowed: true };
            return execution.capability === capability
              ? { allowed: true }
              : {
                  allowed: false,
                  reason:
                    `ARK still owns ${execution.capability}; refusing to start a different action until that durable execution is resolved.`,
                };
          },
          resolvePlanId: ({ capability }) => {
            const execution = agencyState.objective?.execution;
            // Once a durable objective exists, its stored task payload is the
            // source of truth. A resumed planner turn does not need to
            // reconstruct byte-identical arguments to recover that work.
            return execution?.capability === capability
              ? execution.planId
              : null;
          },
          onEnqueued: async ({ objectiveId, planId, capability }) => {
            const execution = agencyState.objective?.execution;
            if (!execution || execution.planId !== planId) return;
            agencyState = await recordAgencyProgress({
              supabase,
              userId,
              projectId,
              agency: agencyState,
              step: agencyState.currentStep,
              execution: {
                ...execution,
                arkObjectiveId: objectiveId,
                status: "dispatched",
              },
              unresolvedWork: [`execute capability: ${capability}`],
            });
          },
        })
      : undefined;

    const agentResult = await runOpenAIAgencyAgent({
      instructions: systemPrompt,
      goal: agencyState.goal,
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
      behaviorRequirements: behaviorGuardRequirements,
      priorActionEvidence: agencyState.unresolvedWork
        .filter((item) => item.startsWith("verify capability result: "))
        .map((item) =>
          `capability ${item.slice("verify capability result: ".length)} completed successfully`,
        ),
      idempotency: {
        claim: ({ key, operation }) =>
          claimAgencyOperation({
            supabase,
            userId,
            projectId,
            key,
            operation,
          }),
        complete: ({ key, result }) =>
          completeAgencyOperation({
            supabase,
            userId,
            projectId,
            key,
            result,
          }),
      },
      executionDelegate: arkExecutionDelegate,
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
          const existingExecution = agencyState.objective?.execution;
          const existingPlanForSelection = existingExecution
            ? arkAgencyPlanId({
                turnId: existingExecution.turnId,
                toolName: name,
                args,
              })
            : null;
          const selectedToolHasBoundary =
            toolNeedsUserBoundary(agencyTools.get(name));
          const execution =
            arkExecutionEnabled && !selectedToolHasBoundary
            ? existingExecution &&
              existingExecution.capability === name &&
              existingExecution.planId === existingPlanForSelection
              ? existingExecution
              : existingExecution
                ? existingExecution
                : {
                    planId: arkAgencyPlanId({
                      turnId,
                      toolName: name,
                      args,
                    }),
                    actionId: "execute",
                    capability: name,
                    arguments: args,
                    turnId,
                    arkObjectiveId: null,
                    status: "selected" as const,
                  }
            : undefined;

          agencyState = await recordAgencyProgress({
            supabase,
            userId,
            projectId,
            agency: agencyState,
            step: agencyState.currentStep,
            unresolvedWork: [`execute capability: ${name}`],
            ...(execution ? { execution } : {}),
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
            // A successful tool call is not the same thing as a completed goal.
            // Keep durable unfinished work alive until the verifier explicitly
            // proves completion. This also makes a process interruption between
            // action and verification resumable on the next turn.
            unresolvedWork: [`verify capability result: ${name}`],
            ...(arkExecutionEnabled ? { execution: null } : {}),
          });

          await timeline.record(
            "observe",
            "action_completed",
            { capability: name },
            name,
          );
        },
        async onToolError({ name, error }) {
          agencyState = await recordAgencyProgress({
            supabase,
            userId,
            projectId,
            agency: agencyState,
            step: agencyState.currentStep,
            unresolvedWork: [`recover capability: ${name}`],
            recurringWeakness: `tool failure: ${name}`,
            strategyChange:
              `When ${name} fails, inspect the failure and choose another reversible route before stopping.`,
            ...(arkExecutionEnabled ? { execution: null } : {}),
          });

          await timeline.record(
            "observe",
            "action_failed",
            {
              capability: name,
              error,
              unresolvedWork: agencyState.unresolvedWork,
            },
            name,
          );
        },

        async onVerification({
          complete,
          score,
          unresolvedWork,
          evidence,
          strategyCorrection,
          behaviorViolations,
        }) {
          let resolvedStrategy: string | null = null;

          if (pendingSelfUpdate) {
            pendingSelfUpdate =
              recordSelfUpdateVerification(
                pendingSelfUpdate,
                {
                  score,
                  behavior: behaviorProof,
                  protectedCorrections,
                  newFailureIntroduced:
                    behaviorViolations.length > 0,
                  now: new Date().toISOString(),
                },
              );

            const lifecycle =
              decideSelfUpdate(
                pendingSelfUpdate,
              );

            if (
              lifecycle.decision.disposition ===
              "retain"
            ) {
              resolvedStrategy =
                pendingSelfUpdate.strategy;

              agencyState = {
                ...agencyState,
                strategyNotes:
                  retainStrategy(
                    agencyState.strategyNotes,
                    pendingSelfUpdate.strategy,
                  ),
              };

              pendingSelfUpdate = null;
            } else if (
              lifecycle.decision.disposition ===
              "revert"
            ) {
              resolvedStrategy =
                pendingSelfUpdate.strategy;
              pendingSelfUpdate = null;
            }
          }

          if (
            durableLearningAuthorized &&
            strategyCorrection &&
            !pendingSelfUpdate &&
            strategyCorrection !== resolvedStrategy
          ) {
            pendingSelfUpdate =
              beginSelfUpdate({
                id: crypto.randomUUID(),
                strategy: strategyCorrection,
                baselineScore: score,
                behavior: behaviorProof,
                protectedCorrections,
                now: new Date().toISOString(),
              });
          }

          agencyState = await recordAgencyProgress({
            supabase,
            userId,
            projectId,
            agency: agencyState,
            step: agencyState.currentStep,
            // Even a passing verifier has one durable step left: persist the
            // canonical assistant turn and commit the agency session complete.
            // Keep that ownership marker until completeAgencySession clears it.
            unresolvedWork: complete
              ? ["finalize verified goal"]
              : unresolvedWork.length
                ? unresolvedWork
                : [`continue goal: ${agencyState.goal}`],
          });

          await timeline.record(
            "verify",
            complete ? "verification_passed" : "verification_failed",
            {
              score,
              evidence,
              unresolvedWork,
              strategyCorrection,
              behaviorViolations,
              pendingSelfUpdate:
                pendingSelfUpdate?.strategy ?? null,
            },
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

    const agentText =
      agentResult.status === "blocked"
        ? agentResult.reason === "irreversible_action"
          ? `I need your approval before I do ${agentResult.toolName.replaceAll("_", " ")} because that action cannot be safely undone.`
          : `I need your choice before I do ${agentResult.toolName.replaceAll("_", " ")} because this is a high-consequence fork.`
        : agentResult.text;

    const deterministicMemoryTurn = classifyMemoryTurn({
      userText,
      extractedItems: [],
    });

    // Non-behavioral factual corrections still enter durable memory through
    // the synchronous correction path below. Runtime corrections were already
    // captured before inference above.
    let explicitCorrectionHandledSynchronously = false;

    const finalAssistant = await finalizeAndPersistAssistantTurn({
      store: turnStore,
      messageId: resolvedTurn.ids.assistantMessageId,
      userId,
      projectId,
      conversationId: convoId,
      episodeId,
      rawAssistantText: agentText,
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
                conversationId: convoId,
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

    if (agentResult.status === "complete") {
      agencyState = await completeAgencySession({
        supabase,
        userId,
        projectId,
        agency: agencyState,
        verified: !finalAssistant.flagged,
      });
    } else if (agentResult.status === "checkpointed") {
      const arkExecution = agencyState.objective?.execution;
      agencyState = await checkpointAgencySession({
        supabase,
        userId,
        projectId,
        agency: agencyState,
        reason: arkExecution
          ? `ARK execution checkpoint persisted: ${arkExecution.arkObjectiveId ?? arkExecution.planId}`
          : "execution ceiling reached after canonical assistant turn persisted",
      });
      if (arkExecution) {
        await timeline.record("persist", "ark_execution_checkpointed", {
          capability: arkExecution.capability,
          planId: arkExecution.planId,
          arkObjectiveId: arkExecution.arkObjectiveId ?? null,
        });
      }
    }

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

    const updatedRuntimeSession =
      await updateRuntimeSession({
      supabase,
      state: runtimeSession,
      activeSubsystem,
      channel: interactionMode,
      currentGoal: agencyState.goal,
      lastMeaningfulArborTurn: assistantText,
      agency: agencyState,
      corrections: runtimeCorrections,
      behaviorProof,
      pendingSelfUpdate,
      now: new Date().toISOString(),
    });

    const traceId = crypto.randomUUID();

    const proofSnapshot = {
      ...buildProofSnapshot({
        anchors: [],
        memoryItems: selectedMemoryItems.map((item) => ({ id: item.id })),
        behavior: behaviorProof,
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
          const correctionIdsObservedThisTurn =
            new Set(
              runtimeCorrections.map(
                (correction) => correction.id,
              ),
            );

          await promoteRepeatedBehaviorCorrections({
            supabase,
            userId,
            currentUserText: userText,
            corrections:
              updatedRuntimeSession.corrections.filter(
                (correction) =>
                  correctionIdsObservedThisTurn.has(
                    correction.id,
                  ),
              ),
          });

          await Promise.all(
            injectedCandidateIds.map((candidateId) =>
              reinforceMemoryCandidate({
                candidateId,
                projectId,
                userId,
                threadId: convoId,
                event: "injected",
              }),
            ),
          );

          const recentExtractionTranscript = [
            ...history
              .slice(-6)
              .map((message) =>
                `${message.role.toUpperCase()}:\n${message.content}`,
              ),
            `ASSISTANT:\n${assistantText}`,
          ].join("\n\n");

          const extracted = await extractMemoryFromText({
            transcript: recentExtractionTranscript,
          });

          const initiallyClassified = classifyMemoryTurn({
            userText,
            extractedItems: extracted,
          });

          let classified = initiallyClassified;

          if (initiallyClassified.kind === "assertion") {
            const relatedMemoryCountByKey =
              await loadRelatedMemoryCounts({
                supabase,
                authedUserId: userId,
                projectId,
                items: initiallyClassified.items,
              });

            const promotionResults = scoreMemoryPromotionBatch({
              items: initiallyClassified.items,
              relatedMemoryCountByKey,
              userMessage: userText,
              assistantMessage: assistantText,
              isTestData: memoryTestMode.shouldPreventLongTermPromotion,
            });

            classified = {
              kind: "assertion" as const,
              items: applyMemoryPromotion(promotionResults),
            };
          }

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
              conversationId: convoId,
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
              convoId,
            );
          }

          await consolidateMemoryCandidates({
            projectId,
            userId,
            threadId: convoId,
          });

          await promoteEligibleMemoryCandidates({
            userId,
            projectId,
            conversationId: convoId,
            supabase,
          });

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

        episode_maintenance: async () => {
          await summarizePriorOpenEpisodes({
            supabase,
            userId,
            projectId,
            currentEpisodeId: episodeId,
            maxEpisodes: 2,
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
        behavior: proofSnapshot.behavior,
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

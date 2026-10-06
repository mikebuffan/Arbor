/**
 * Opt-in READ-ONLY Firefly host bridge, NOT a Grove route or authentication
 * adapter for a Grove JWT. A trusted host must first map/invite the Grove
 * principal through its already-reviewed Firefly bridge before passing the
 * authenticated Firefly user ID here. Do not expose this to arbitrary clients.
 *
 * Reuses existing ownership, ARK read-model and runtime continuity code;
 * does not duplicate these modules or infer objective completion from counts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertConversationOwnedByUser, assertProjectOwnedByUser,
} from "../auth/ownership";
import { readArkProjectSnapshot } from "../ark/readModel";
import { loadRuntimeState } from "../arbor/runtime/runtimeStateStore";
import { behaviorCorrections } from "../arbor/runtime/corrections";
import { buildContinuityState } from "../arbor/continuity/state";
import type { ArborInteractionMode } from "../arbor/behavior/behaviorProjection";
import type { CognitiveHostTurn, ScopedContinuityForTurn } from "./cognitiveSessionPort";

export type CognitiveHostReadResult = {
  host: CognitiveHostTurn;
  /** Exact conversation only; project fallback is intentionally not mislabeled. */
  continuity: ScopedContinuityForTurn | null;
  ark: {
    available: boolean;
    objectiveCountInWindow: number;
    taskCountInWindow: number;
    windowMayBeTruncated: boolean;
    /** A read-model count cannot prove any worker is running or finished. */
    liveExecutionVerified: false;
    completionVerified: false;
  };
  grantsExecution: false;
};

/** Owner+conversation checks finish BEFORE querying ARK or continuity. */
export async function readVerifiedCognitiveHost(input: {
  supabase: SupabaseClient;
  authenticatedUserId: string;
  projectId: string;
  conversationId: string;
  turnId: string;
  mode: ArborInteractionMode;
}): Promise<CognitiveHostReadResult> {
  const { supabase, projectId, conversationId } = input;
  const userId = input.authenticatedUserId;
  if (![userId, projectId, conversationId, input.turnId].every(x => x?.trim()) ||
      !["text", "voice", "annabelle"].includes(input.mode))
    throw new Error("cognitive_host_read_scope_required");
  await assertProjectOwnedByUser(supabase, userId, projectId);
  await assertConversationOwnedByUser({ supabase, userId, projectId, conversationId });
  const [ark, state] = await Promise.all([
    readArkProjectSnapshot({ supabase, userId, projectId,
      objectiveLimit: 20, eventLimit: 100 }),
    loadRuntimeState({ supabase, userId, projectId, conversationId }),
  ]);
  if (state && (state.userId !== userId || state.projectId !== projectId))
    throw new Error("cognitive_host_continuity_scope_invalid");
  const isExact = !!state && state.conversationId === conversationId;
  const continuity: ScopedContinuityForTurn | null = isExact && state ? {
    userId, projectId, conversationId,
    state: {
      ...buildContinuityState({
        agency: state.agency,
        activeSubsystem: state.activeSubsystem,
        channel: input.mode === "voice" ? "voice" : "text",
        lastMeaningfulUserTurn: state.lastMeaningfulUserTurn,
        lastMeaningfulArborTurn: state.lastMeaningfulArborTurn,
        activeCorrections: behaviorCorrections(state.corrections ?? []),
      }),
      // Older runtime rows may have a goal without a full AgencyState.
      // Keep that real goal rather than turning existing continuity blank.
      currentGoal: state.agency?.goal?.trim() || state.currentGoal?.trim() || null,
    },
  } : null;
  return {
    host: { userId, projectId, conversationId, turnId: input.turnId },
    continuity,
    ark: { available: ark.available,
      objectiveCountInWindow: ark.objectives.length,
      taskCountInWindow: ark.tasks.length,
      windowMayBeTruncated: ark.objectives.length >= 20 || ark.events.length >= 100,
      liveExecutionVerified: false, completionVerified: false },
    grantsExecution: false,
  };
}
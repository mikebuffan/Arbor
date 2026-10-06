import { renderCanonicalIdentityAnchor } from "@/lib/arbor/selfModel/canonicalIdentityAnchor";
import { loadDurableBehaviorCorrections } from "@/lib/arbor/runtime/correctionPromotion";
import { mergeCorrectionSnapshots } from "@/lib/arbor/runtime/runtimeState";
import { behaviorCorrections } from "@/lib/arbor/runtime/corrections";
import { readArborMemoryRecall } from "@/lib/memory/readRecall";
import { memoryRecallQuery } from "@/lib/memory/recallQuery";
import { promptDataBlock } from "@/lib/arbor/promptData";
import { buildTimeCore, renderTimeCorePromptBlock } from "@/lib/arbor/runtime/timeCore";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertConversationOwnedByUser,
  assertProjectOwnedByUser,
} from "@/lib/auth/ownership";
import { readArkProjectSnapshot } from "@/lib/ark/readModel";
import { assertAttachmentOwnedByScope } from "@/lib/attachments/scope";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import {
  loadLatestRuntimeState,
  loadRuntimeState,
} from "@/lib/arbor/runtime/runtimeStateStore";
import { projectRuntimeStartup } from "@/lib/arbor/runtime/hostProjection";
import {
  buildArborBehaviorProjection,
  type ArborBehaviorProjection,
  type ArborInteractionMode,
} from "./behaviorProjection";

/**
 * Authenticated READ crossing into Arbor LM. This does not start a worker,
 * select an ARK objective, or grant authority from pasted checkpoint text.
 *
 * The actual active-objective/next-action selector belongs to draft PR #125.
 * Reuse it once independently reviewed instead of cloning its algorithm here.
 */
export type ArkLayerReadContext = {
  access: "read-only";
  projectId: string;
  ark: {
    available: boolean;
    capturedAt: string;
    objectiveCountInWindow: number;
    taskCountInWindow: number;
    checkpointCountInWindow: number;
    eventCountInWindow: number;
    /** Read limits mean the counted window may exclude older objectives. */
    windowMayBeTruncated: boolean;
    activeObjectiveHandoff: "not_resolved";
    liveExecutionVerified: false;
  };
  continuity: {
    available: boolean;
    source: "requested_conversation" | "project_latest" | "project_fallback" | "unavailable";
    currentGoal: string | null;
    unresolvedWork: string[];
    acousticCorrections: string[];
    behavioralCorrections: string[];
    startupPrompt: string | null;
  };
  /** A selected file is metadata only; actual file bytes require a new brokered read. */
  selectedAttachment: null | {
    source: "chat_attachment_metadata";
    attachmentId: string;
    projectId: string;
    conversationId: string;
    displayName: string;
    originalBytesRead: false;
    citationVerified: false;
  };
  behavior: ArborBehaviorProjection;
};

export async function readArkLayerContext(input: {
  supabase: SupabaseClient;
  /** Obtained from validated auth session, never from user text or model output. */
  authenticatedUserId: string;
  projectId: string;
  conversationId?: string | null;
  /** Only on explicit file selection; omitted for ordinary conversation reads. */
  selectedAttachment?: { conversationId: string; attachmentId: string } | null;
  mode: ArborInteractionMode;
  /** Authenticated surface offset only; the server owns the instant. */
  timeZoneOffsetMinutes?: number | null;
  /** Actual current user turn from the verified host; not supplied context. */
  latestUserText?: string;
}): Promise<ArkLayerReadContext> {
  const { supabase, authenticatedUserId: userId, projectId } = input;
  // An explicitly selected file must belong to the CURRENT requested
  // conversation, not merely another conversation under the same project.
  // Reject a missing/mismatching conversation before any scoped DB read.
  if (input.selectedAttachment &&
      (!input.conversationId ||
       input.selectedAttachment.conversationId !== input.conversationId)) {
    throw new RouteAccessError(404, "attachment_not_found");
  }
  await assertProjectOwnedByUser(supabase, userId, projectId);
  if (input.conversationId) {
    await assertConversationOwnedByUser({
      supabase,
      userId,
      projectId,
      conversationId: input.conversationId,
    });
  }

  // Read state only AFTER checking ownership; both reads remain project-scoped.
  const [ark, storedState, selectedFile] = await Promise.all([
    readArkProjectSnapshot({
      supabase,
      userId,
      projectId,
      objectiveLimit: 20,
      eventLimit: 100,
    }),
    input.conversationId
      ? loadRuntimeState({
          supabase,
          userId,
          projectId,
          conversationId: input.conversationId,
          exactConversationOnly: true,
        })
      : loadLatestRuntimeState({ supabase, userId, projectId }),
    input.selectedAttachment
      ? assertAttachmentOwnedByScope({
          supabase, userId, projectId,
          conversationId: input.selectedAttachment.conversationId,
          attachmentId: input.selectedAttachment.attachmentId,
        })
      : Promise.resolve(null),
  ]);

  if (selectedFile && selectedFile.status !== "uploaded") {
    throw new RouteAccessError(404, "attachment_not_found");
  }

  // Supabase RLS/queries are defenses too, but never trust a corrupted or
  // mis-scoped persisted JSON state simply because it came from a scoped row.
  if (
    storedState &&
    (storedState.userId !== userId || storedState.projectId !== projectId)
  ) throw new Error("ark_layer_continuity_scope_mismatch");

  const state = storedState
    ? {
        ...storedState,
        channel: input.mode === "voice" ? "voice" as const :
          input.mode === "text" ? "text" as const : storedState.channel,
        activeSubsystem: input.mode === "annabelle"
          ? "annabelle" as const : "arbor" as const,
      }
    : null;

  const startup = state ? projectRuntimeStartup(state) : null;
  const durable = await loadDurableBehaviorCorrections({ supabase, userId });
  const correctionRules = behaviorCorrections(mergeCorrectionSnapshots([
    durable, state?.corrections ?? [],
  ]));
  const recall = input.latestUserText === undefined ? null : await readArborMemoryRecall({
    supabase, userId, projectId,
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    query: memoryRecallQuery(input.latestUserText,
      state?.agency?.status === "complete" ? null : state?.currentGoal),
    revealUserText: input.latestUserText,
  });
  const continuityMaterial = [
    renderTimeCorePromptBlock(buildTimeCore({
      utcOffsetMinutes: input.timeZoneOffsetMinutes,
    })),
    ...(startup ? [startup.startup.promptBlock] : []),
    promptDataBlock("OWNED ARK OBJECTIVE WINDOW — ACTIVE OBJECTIVE NOT SELECTED", {
      capturedAt: ark.capturedAt, available: ark.available,
      objectives: ark.objectives.slice(0, 3).map(row => ({
        id: row.id, goal: typeof row.goal === "string" ? row.goal.slice(0, 1000) : null,
        status: row.status,
      })),
      windowMayBeTruncated: ark.objectives.length > 3,
      executionAuthority: "none",
    }),
    ...(recall ? [recall.recallPrompt] : []),
  ];

  return {
    access: "read-only",
    projectId,
    ark: {
      available: ark.available,
      capturedAt: ark.capturedAt,
      objectiveCountInWindow: ark.objectives.length,
      taskCountInWindow: ark.tasks.length,
      checkpointCountInWindow: ark.checkpoints.length,
      eventCountInWindow: ark.events.length,
      windowMayBeTruncated: ark.objectives.length >= 20 ||
        ark.events.length >= 100,
      activeObjectiveHandoff: "not_resolved",
      liveExecutionVerified: false,
    },
    continuity: {
      available: Boolean(state),
      source: !state ? "unavailable" :
        !input.conversationId ? "project_latest" :
        state.conversationId !== input.conversationId
          ? "project_fallback" : "requested_conversation",
      currentGoal: state?.currentGoal ?? null,
      unresolvedWork: state?.agency?.unresolvedWork ?? [],
      acousticCorrections: startup?.acousticCorrections ?? [],
      behavioralCorrections: correctionRules,
      startupPrompt: startup?.startup.promptBlock ?? null,
    },
    selectedAttachment: selectedFile && input.selectedAttachment ? {
      source: "chat_attachment_metadata",
      attachmentId: input.selectedAttachment.attachmentId,
      projectId,
      conversationId: input.selectedAttachment.conversationId,
      displayName: selectedFile.storage_path
        .slice(selectedFile.storage_path.lastIndexOf("/") + 1)
        .replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, 120) ||
        "Unnamed attachment",
      originalBytesRead: false,
      citationVerified: false,
    } : null,
    behavior: buildArborBehaviorProjection({
      mode: input.mode,
      stableBehaviorMaterial: [renderCanonicalIdentityAnchor()],
      correctionRules,
      continuityMaterial,
      // Unlike main chat's existing prompt assembler, standalone LM does
      // not inject host continuity separately.
      includeContextInPromptBlock: true,
    }),
  };
}

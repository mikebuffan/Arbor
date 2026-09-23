import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { RouteAccessError } from "@/lib/auth/routeAuthorization";
import {
  authorizePrivateGroveConversation,
} from "@/lib/grove/privateReadBroker";
import {
  readArkLayerContext, type ArkLayerReadContext,
} from "@/lib/arbor/behavior/arkLayerReadContext";
import {
  sendPrivateGroveLmTurnFromVerifiedHost,
  type GroveLmUnverifiedReply,
} from "@/lib/grove/privateLmHostTransport";
import {
  readVerifiedCognitiveHost,
  type CognitiveHostReadResult,
} from "@/lib/learning/cognitiveHostRead";
import {
  previewFireflyCognitiveRoundabout,
  type FireflyCognitivePreviewResult,
} from "@/lib/learning/fireflyCognitiveRoundabout";
import type { CognitiveSnapshotPort } from "@/lib/learning/cognitiveSessionPort";
import type { ScopedHopEvidence } from "@/lib/learning/cognitiveAssembly";
import {
  createSupabaseGrovePrivateTranscriptStore,
  selectPrivateModelHistory,
  transcriptRowToUnverifiedReply,
  type GrovePrivateTranscriptStore,
} from "@/lib/grove/privateTranscriptStore";

/**
 * Private Grove -> verified Firefly conversation -> ARK/Layer -> optional
 * Firefly roundabout preflight -> signed independent LM host.
 *
 * The current v0.3.5 Python receiver accepts a STRICT ArkLayerReadContext
 * only. Do not smuggle a second cognitive schema or untrusted retrieved text
 * into its context/history. Until a separately reviewed receiver update, the
 * cognitive preview is a conservative host-only HOLD/CONTINUE gate; ARK/Layer
 * provides the language model's existing continuity data.
 *
 * NO ARK execution, tool receipts or public-Firefly message writes. Optional
 * Grove-only complete-turn persistence is separately gated and never proves
 * an ARK objective finished.
 */

export class GrovePrivateRequestError extends Error {
  constructor(readonly status: 400 | 413 | 415 | 503, readonly code: string) {
    super(code);
    this.name = "GrovePrivateRequestError";
  }
}

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GrovePrivateTurnFeatures = {
  chatEnabled: boolean;
  modelEnabled: boolean;
  cognitivePreviewEnabled: boolean;
  /** An independent approval gate; old draft chat behavior remains unchanged. */
  transcriptEnabled?: boolean;
};

export function grovePrivateTurnFeatures(
  env: Record<string, string | undefined> = process.env,
): GrovePrivateTurnFeatures {
  return {
    chatEnabled: env.GROVE_PRIVATE_CHAT_PREVIEW_ENABLED === "true",
    modelEnabled: env.GROVE_PRIVATE_MODEL_TURN_ENABLED === "true",
    cognitivePreviewEnabled: env.GROVE_COGNITIVE_PREVIEW_ENABLED === "true",
    transcriptEnabled: env.GROVE_PRIVATE_TRANSCRIPT_ENABLED === "true",
  };
}

type VerifiedConversation = {
  access: "read-only";
  fireflyAdmin: SupabaseClient;
  groveAdmin: SupabaseClient;
  fireflyUserId: string;
  groveUserId: string;
  projectId: string;
  conversationId: string;
};

export type GroveTrustedCognitiveRetrieval = {
  store: CognitiveSnapshotPort;
  /**
   * Trusted, project-scoped search. Must return REAL, provenance-bearing
   * evidence rather than creating a synthetic memory from the user message.
   * A missing provider is a hard feature-OFF blocker, not a blank "brain".
   */
  retrieve: (input: {
    userId: string;
    projectId: string;
    conversationId: string;
    turnId: string;
    cue: string;
  }) => Promise<{
    seed: ScopedHopEvidence;
    candidates: readonly ScopedHopEvidence[];
  }>;
};

export type GroveVerifiedTurn = {
  scope: {
    ownerId: string;
    projectId: string;
    conversationId: string;
    turnId: string;
  };
  userText: string;
  arkLayer: ArkLayerReadContext;
  cognitive: FireflyCognitivePreviewResult | null;
  transcript: { store: GrovePrivateTranscriptStore;
    groveUserId: string; requestId: string;
    /** Freshly re-check owner, bridge, grant and conversation AFTER inference. */
    reauthorize: () => Promise<void> } | null;
  /** A hold prevents any model call, even when an objective is still open. */
  status: "ready" | "held";
  holdReason: string | null;
  grantsExecution: false;
  verifiesCompletion: false;
};

export type GroveTurnDeps = {
  authorize?: typeof authorizePrivateGroveConversation;
  readLayer?: typeof readArkLayerContext;
  readCognitiveHost?: typeof readVerifiedCognitiveHost;
  previewCognitive?: typeof previewFireflyCognitiveRoundabout;
  sendModel?: typeof sendPrivateGroveLmTurnFromVerifiedHost;
  cognitiveRetrieval?: GroveTrustedCognitiveRetrieval;
  /** Synthetic/integration substitute; never sourced from a browser. */
  transcriptStore?: GrovePrivateTranscriptStore;
};

export async function prepareVerifiedPrivateGroveTurn(input: {
  request: Request;
  projectId: string;
  conversationId: string;
  message: string;
  /** Client-generated retry ID only, NEVER authentication or a model turn ID. */
  requestId?: string;
  features?: GrovePrivateTurnFeatures;
  dependencies?: GroveTurnDeps;
}): Promise<GroveVerifiedTurn> {
  const features = input.features ?? grovePrivateTurnFeatures();
  if (!features.chatEnabled)
    throw new RouteAccessError(404, "grove_private_chat_not_enabled");
  if (!uuid.test(input.projectId) || !uuid.test(input.conversationId))
    throw new RouteAccessError(404, "grove_invalid_conversation_scope");
  if (typeof input.message !== "string" ||
      !input.message.trim() || input.message.length > 3000)
    throw new GrovePrivateRequestError(400, "grove_private_message_invalid");
  if (input.requestId !== undefined && !uuid.test(input.requestId))
    throw new GrovePrivateRequestError(400, "grove_private_request_id_invalid");
  const deps = input.dependencies ?? {};
  const authorized: VerifiedConversation =
    await (deps.authorize ?? authorizePrivateGroveConversation)(
      input.request, input.projectId, input.conversationId,
    );
  if (authorized.access !== "read-only" ||
      authorized.projectId !== input.projectId ||
      authorized.conversationId !== input.conversationId ||
      !uuid.test(authorized.fireflyUserId) ||
      !uuid.test(authorized.groveUserId))
    throw new RouteAccessError(403, "grove_private_scope_rejected");

  // Reuse the existing ARK + Arbor Layer read model, and NEVER label another
  // conversation's project fallback as THIS conversation's continuity.
  const readLayer = deps.readLayer ?? readArkLayerContext;
  const arkLayer = await readLayer({
    supabase: authorized.fireflyAdmin,
    authenticatedUserId: authorized.fireflyUserId,
    projectId: input.projectId,
    conversationId: input.conversationId,
    mode: "text",
  });
  if (arkLayer.access !== "read-only" ||
      arkLayer.projectId !== input.projectId ||
      arkLayer.continuity.source === "project_fallback" ||
      arkLayer.continuity.source === "project_latest")
    throw new RouteAccessError(409, "grove_private_continuity_scope_rejected");

  const turnId = randomUUID();
  const scope = {
    ownerId: authorized.fireflyUserId,
    projectId: input.projectId,
    conversationId: input.conversationId,
    turnId,
  };
  const transcript = features.transcriptEnabled ? {
    store: deps.transcriptStore ??
      createSupabaseGrovePrivateTranscriptStore(authorized.groveAdmin),
    groveUserId: authorized.groveUserId,
    requestId: input.requestId ?? randomUUID(),
    reauthorize: async () => {
      // An invitation, project grant, account bridge or Firefly conversation
      // can be revoked WHILE the private LM is generating. A service-role
      // transcript writer must never outlive that authorization.
      const current = await (deps.authorize ?? authorizePrivateGroveConversation)(
        input.request, input.projectId, input.conversationId,
      );
      if (current.access !== "read-only" ||
          current.groveUserId !== authorized.groveUserId ||
          current.fireflyUserId !== authorized.fireflyUserId ||
          current.projectId !== input.projectId ||
          current.conversationId !== input.conversationId)
        throw new RouteAccessError(403, "grove_private_access_changed");
    },
  } : null;
  let cognitive: FireflyCognitivePreviewResult | null = null;
  if (features.cognitivePreviewEnabled) {
    const provider = deps.cognitiveRetrieval;
    if (!provider)
      throw new GrovePrivateRequestError(503, "grove_cognitive_retrieval_not_ready");
    // The cognitive project's stored learning and active conversation context
    // are separately scoped; neither a browser nor model supplies the goal.
    const verified: CognitiveHostReadResult =
      await (deps.readCognitiveHost ?? readVerifiedCognitiveHost)({
        supabase: authorized.fireflyAdmin,
        authenticatedUserId: authorized.fireflyUserId,
        projectId: input.projectId,
        conversationId: input.conversationId,
        turnId,
        mode: "text",
      });
    if (verified.host.userId !== scope.ownerId ||
        verified.host.projectId !== scope.projectId ||
        verified.host.conversationId !== scope.conversationId ||
        verified.host.turnId !== turnId)
      throw new RouteAccessError(409, "grove_cognitive_scope_mismatch");

    const evidence = await provider.retrieve({
      userId: scope.ownerId, projectId: scope.projectId,
      conversationId: scope.conversationId, turnId, cue: input.message,
    });
    cognitive = await (deps.previewCognitive ?? previewFireflyCognitiveRoundabout)({
      enabled: true, host: verified.host, store: provider.store,
      cue: input.message, seed: evidence.seed,
      candidates: evidence.candidates, mode: "text",
      activeSubsystem: "arbor", continuity: verified.continuity,
      domain: "project", stage: "observe",
      // Default workflow phase is an explicit fresh observation, never an
      // inferred diagnosis of the human or a model-selected phase.
      rhythm: "stability",
      signal: verified.continuity?.state.unresolvedWork.length
        ? "unresolved_work" : "retrieval",
    });
    if (cognitive.status !== "ready")
      return { scope, userText: input.message, arkLayer, cognitive, transcript,
        status: "held", holdReason: "cognitive_" + cognitive.status,
        grantsExecution: false, verifiesCompletion: false };
    if (cognitive.roundabout.decision === "hold" ||
        cognitive.roundabout.decision === "escalate" ||
        cognitive.roundabout.requiresReview ||
        cognitive.prepared.cycle.routeAbstained)
      return { scope, userText: input.message, arkLayer, cognitive, transcript,
        status: "held", holdReason: cognitive.roundabout.reason,
        grantsExecution: false, verifiesCompletion: false };
  }

  return {
    scope, userText: input.message, arkLayer, cognitive, transcript,
    status: "ready", holdReason: null,
    grantsExecution: false, verifiesCompletion: false,
  };
}

export type GrovePrivateTurnResponse =
  | { status: "held"; reason: string; grantsExecution: false;
      verifiesCompletion: false }
  | { status: "responded"; reply: GroveLmUnverifiedReply;
      persisted: boolean; replayed: boolean; requestId: string | null;
      grantsExecution: false; verifiesCompletion: false };

/** No browser-supplied history or role labels; no implicit model execution. */
export async function respondToVerifiedPrivateGroveTurn(input: {
  prepared: GroveVerifiedTurn;
  features?: GrovePrivateTurnFeatures;
  dependencies?: GroveTurnDeps;
}): Promise<GrovePrivateTurnResponse> {
  if (input.prepared.status === "held")
    return { status: "held",
      reason: input.prepared.holdReason ?? "review_required",
      grantsExecution: false, verifiesCompletion: false };
  const features = input.features ?? grovePrivateTurnFeatures();
  if (!features.chatEnabled || !features.modelEnabled)
    throw new RouteAccessError(404, "grove_private_model_not_enabled");
  const { scope, arkLayer, userText } = input.prepared;
  if (!uuid.test(scope.ownerId) || !uuid.test(scope.projectId) ||
      !uuid.test(scope.conversationId) || !uuid.test(scope.turnId) ||
      arkLayer.access !== "read-only" ||
      arkLayer.projectId !== scope.projectId ||
      arkLayer.continuity.source === "project_fallback" ||
      arkLayer.continuity.source === "project_latest")
    throw new RouteAccessError(409, "grove_private_turn_scope_rejected");
  const transcript = features.transcriptEnabled ? input.prepared.transcript : null;
  if (features.transcriptEnabled && !transcript)
    throw new RouteAccessError(409, "grove_private_transcript_unavailable");
  const transcriptScope = transcript ? {
    groveUserId: transcript.groveUserId,
    projectId: scope.projectId,
    conversationId: scope.conversationId,
  } : null;
  if (transcript && transcriptScope) {
    const completed = await transcript.store.getCompleted({
      ...transcriptScope, requestId: transcript.requestId,
    });
    if (completed) {
      if (completed.user_text !== userText)
        throw new RouteAccessError(409, "grove_transcript_request_conflict");
      return {
        status: "responded",
        reply: transcriptRowToUnverifiedReply(completed, transcriptScope),
        persisted: true, replayed: true,
        requestId: transcript.requestId,
        grantsExecution: false, verifiesCompletion: false,
      };
    }
  }
  const history = transcript && transcriptScope
    ? selectPrivateModelHistory({
        completedNewestFirst: await transcript.store.listRecent(transcriptScope),
        scope: transcriptScope, userText,
      })
    : [{ role: "user" as const, content: userText }];
  const reply = await (
    input.dependencies?.sendModel ?? sendPrivateGroveLmTurnFromVerifiedHost
  )({
    ownerId: scope.ownerId,
    projectId: scope.projectId,
    conversationId: scope.conversationId,
    readContext: arkLayer,
    // The STRICT v0.3.5 receiver has no trusted cognitive payload field yet.
    // Do not pass it in messages or as a forged Layer/ARK object.
    messages: history,
  });
  if (transcript && transcriptScope) {
    // Reauthorization MUST complete before a service-role write. Do not
    // persist or return a private model reply if access changed mid-turn.
    await transcript.reauthorize();
    const saved = await transcript.store.persistCompleted({
      ...transcriptScope, requestId: transcript.requestId,
      userText, reply,
    });
    return {
      status: "responded",
      reply: transcriptRowToUnverifiedReply(saved.row, transcriptScope),
      persisted: true, replayed: !saved.created,
      requestId: transcript.requestId,
      grantsExecution: false, verifiesCompletion: false,
    };
  }
  return { status: "responded", reply,
    persisted: false, replayed: false, requestId: null,
    grantsExecution: false, verifiesCompletion: false };
}

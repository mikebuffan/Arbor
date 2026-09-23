import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  grovePrivateTurnFeatures,
  prepareVerifiedPrivateGroveTurn,
  respondToVerifiedPrivateGroveTurn,
  type GrovePrivateTurnFeatures,
} from "../privateConversationLoop";

const uuids = {
  grove: "00000000-0000-4000-8000-000000000001",
  owner: "00000000-0000-4000-8000-000000000002",
  project: "00000000-0000-4000-8000-000000000003",
  conversation: "00000000-0000-4000-8000-000000000004",
};
const flags: GrovePrivateTurnFeatures = {
  chatEnabled: true, modelEnabled: true, cognitivePreviewEnabled: false,
};
const req = new Request("https://private-grove.example.org/api/grove/chat", {
  headers: { authorization: "Bearer synthetic-only" },
});
const layer = (source = "requested_conversation") => ({
  access: "read-only" as const,
  projectId: uuids.project,
  ark: {
    available: true, capturedAt: "2026-09-23T00:00:00Z",
    objectiveCountInWindow: 1, taskCountInWindow: 1,
    checkpointCountInWindow: 1, eventCountInWindow: 1,
    windowMayBeTruncated: false,
    activeObjectiveHandoff: "not_resolved" as const,
    liveExecutionVerified: false as const,
  },
  continuity: {
    available: true,
    source, currentGoal: "Finish Grove",
    unresolvedWork: ["Verify private host integration"],
    acousticCorrections: [], behavioralCorrections: [],
    startupPrompt: "Trusted host supplied startup block",
  },
  selectedAttachment: null,
  behavior: { proof: { schemaVersion: 1 }, promptBlock: "trusted" },
});
function harness() {
  const auth = vi.fn(async () => ({
    groveUserId: uuids.grove, fireflyUserId: uuids.owner,
    projectId: uuids.project, conversationId: uuids.conversation,
    fireflyAdmin: { synthetic: true }, access: "read-only" as const,
  }));
  const readLayer = vi.fn(async () => layer());
  const readCognitiveHost = vi.fn(async (input: Record<string, unknown>) => ({
    host: {
      userId: input.authenticatedUserId, projectId: input.projectId,
      conversationId: input.conversationId, turnId: input.turnId,
    },
    continuity: {
      userId: input.authenticatedUserId,
      projectId: input.projectId,
      conversationId: input.conversationId,
      state: {
        currentGoal: "Finish Grove",
        unresolvedWork: ["Verify private host integration"],
      },
    },
  }));
  const seed = {
    userId: uuids.owner, projectId: uuids.project, id: "seed",
    source: "synthetic", sourceFamilyId: "synthetic-family",
    evidenceType: "synthetic", content: "Keep going", confidence: 0.8,
    epistemicStatus: "direct" as const, retrievalScore: 0.9,
    retrievalMethod: "synthetic",
  };
  const retrieve = vi.fn(async () => ({ seed, candidates: [] }));
  const previewCognitive = vi.fn(async () => ({
    status: "ready" as const,
    roundabout: {
      decision: "continue", requiresReview: false, reason: "normal_progress",
    },
    prepared: {
      cycle: { routeAbstained: false },
    },
  }));
  const sendModel = vi.fn(async () => ({
    reply: "I can see the unfinished goal, but this is not work execution.",
    model: "arbor-lm-v0.3" as const,
    replyVerification: "unverified_model_text" as const,
    arkConnected: true, continuityFetched: true,
    liveExecutionVerified: false as const,
    workReceipts: [] as [],
  }));
  const dependencies = {
    authorize: auth as never,
    readLayer: readLayer as never,
    readCognitiveHost: readCognitiveHost as never,
    previewCognitive: previewCognitive as never,
    sendModel: sendModel as never,
    cognitiveRetrieval: {
      store: { read: vi.fn(), compareAndSwap: vi.fn() },
      retrieve,
    } as never,
  };
  const prepare = (overrides: Record<string, unknown> = {}) =>
    prepareVerifiedPrivateGroveTurn({
      request: req, projectId: uuids.project,
      conversationId: uuids.conversation,
      message: "List and go", features: flags,
      dependencies, ...overrides,
    });
  return { auth, readLayer, readCognitiveHost, retrieve,
    previewCognitive, sendModel, dependencies, prepare };
}
beforeEach(() => vi.clearAllMocks());

describe("real module composition — LIVE FEATURES STILL OFF", () => {
  it("defaults to all feature switches OFF", () => {
    expect(grovePrivateTurnFeatures({})).toEqual({
      chatEnabled: false, modelEnabled: false, cognitivePreviewEnabled: false,
      transcriptEnabled: false,
      claimEnabled: false,
    });
    expect(grovePrivateTurnFeatures({
      GROVE_PRIVATE_CHAT_PREVIEW_ENABLED: "yes",
      GROVE_PRIVATE_MODEL_TURN_ENABLED: "TRUE",
      GROVE_COGNITIVE_PREVIEW_ENABLED: "true",
    })).toEqual({
      chatEnabled: false, modelEnabled: false, cognitivePreviewEnabled: true,
      transcriptEnabled: false,
      claimEnabled: false,
    });
  });

  it("stops before owner auth when chat feature is OFF or identifiers invalid", async () => {
    const h = harness();
    await expect(h.prepare({ features: { ...flags, chatEnabled: false } }))
      .rejects.toMatchObject({ status: 404, code: "grove_private_chat_not_enabled" });
    await expect(h.prepare({ projectId: "different-project" }))
      .rejects.toMatchObject({ status: 404, code: "grove_invalid_conversation_scope" });
    await expect(h.prepare({ message: "" }))
      .rejects.toMatchObject({ status: 400, code: "grove_private_message_invalid" });
    expect(h.auth).not.toHaveBeenCalled();
    expect(h.sendModel).not.toHaveBeenCalled();
  });

  it("proves authorized Grove principal before requesting Firefly/ARK context", async () => {
    const h = harness();
    const prepared = await h.prepare();
    expect(h.auth).toHaveBeenCalledWith(req, uuids.project, uuids.conversation);
    expect(h.readLayer).toHaveBeenCalledWith({
      supabase: { synthetic: true },
      authenticatedUserId: uuids.owner,
      projectId: uuids.project, conversationId: uuids.conversation, mode: "text",
    });
    expect(prepared.arkLayer.continuity.currentGoal).toBe("Finish Grove");
    expect(prepared.status).toBe("ready");
    expect(prepared.scope.ownerId).toBe(uuids.owner);
    expect(prepared.scope.turnId).toMatch(/^[0-9a-f-]{36}$/);
    expect(h.sendModel).not.toHaveBeenCalled();
  });

  it("refuses a revoked/mismatched Grove grant before ARK/LM", async () => {
    const h = harness();
    h.auth.mockResolvedValueOnce({
      groveUserId: uuids.grove, fireflyUserId: uuids.owner,
      projectId: "foreign-project", conversationId: uuids.conversation,
      fireflyAdmin: { synthetic: true }, access: "read-only",
    } as never);
    await expect(h.prepare()).rejects.toMatchObject({
      status: 403, code: "grove_private_scope_rejected",
    });
    expect(h.readLayer).not.toHaveBeenCalled();
    expect(h.sendModel).not.toHaveBeenCalled();
  });

  it("does not pass project fallback from another conversation to LM", async () => {
    const h = harness();
    h.readLayer.mockResolvedValueOnce(layer("project_fallback") as never);
    await expect(h.prepare()).rejects.toMatchObject({
      status: 409, code: "grove_private_continuity_scope_rejected",
    });
    expect(h.sendModel).not.toHaveBeenCalled();
  });

  it("the existing private host receiver gets one user turn and verified ARK Layer", async () => {
    const h = harness();
    const prepared = await h.prepare();
    const result = await respondToVerifiedPrivateGroveTurn({
      prepared, features: flags, dependencies: h.dependencies,
    });
    expect(h.sendModel).toHaveBeenCalledTimes(1);
    expect(h.sendModel).toHaveBeenCalledWith({
      ownerId: uuids.owner, projectId: uuids.project,
      conversationId: uuids.conversation,
      readContext: prepared.arkLayer,
      messages: [{ role: "user", content: "List and go" }],
    });
    expect(result).toMatchObject({
      status: "responded", grantsExecution: false,
      verifiesCompletion: false,
      reply: { liveExecutionVerified: false, workReceipts: [] },
    });
    expect(JSON.stringify(h.sendModel.mock.calls[0])).not.toContain("synthetic-family");
  });

  it("model feature OFF cannot send even when owner and ARK were checked", async () => {
    const h = harness();
    const prepared = await h.prepare();
    await expect(respondToVerifiedPrivateGroveTurn({
      prepared, features: { ...flags, modelEnabled: false },
      dependencies: h.dependencies,
    })).rejects.toMatchObject({
      status: 404, code: "grove_private_model_not_enabled",
    });
    expect(h.sendModel).not.toHaveBeenCalled();
  });

  it("enabled cognition without real evidence provider FAILS CLOSED", async () => {
    const h = harness();
    await expect(h.prepare({
      features: { ...flags, cognitivePreviewEnabled: true },
      dependencies: { ...h.dependencies, cognitiveRetrieval: undefined },
    })).rejects.toMatchObject({
      status: 503, code: "grove_cognitive_retrieval_not_ready",
    });
    expect(h.readCognitiveHost).not.toHaveBeenCalled();
    expect(h.sendModel).not.toHaveBeenCalled();
  });

  it("cognitive preview uses server-minted same-turn ID, not user-provided evidence", async () => {
    const h = harness();
    const prepared = await h.prepare({
      features: { ...flags, cognitivePreviewEnabled: true },
    });
    expect(h.readCognitiveHost).toHaveBeenCalledWith(expect.objectContaining({
      authenticatedUserId: uuids.owner,
      projectId: uuids.project, conversationId: uuids.conversation,
      turnId: prepared.scope.turnId, mode: "text",
    }));
    expect(h.retrieve).toHaveBeenCalledWith({
      userId: uuids.owner, projectId: uuids.project,
      conversationId: uuids.conversation, turnId: prepared.scope.turnId,
      cue: "List and go",
    });
    expect(h.previewCognitive).toHaveBeenCalledWith(
      expect.objectContaining({
        host: expect.objectContaining({
          userId: uuids.owner, projectId: uuids.project,
          conversationId: uuids.conversation,
          turnId: prepared.scope.turnId,
        }),
        domain: "project", stage: "observe",
        rhythm: "stability", signal: "unresolved_work",
      }),
    );
  });

  it("contradictions HOLD the model call; objective stays unaltered", async () => {
    const h = harness();
    h.previewCognitive.mockResolvedValueOnce({
      status: "ready", roundabout: {
        decision: "hold", requiresReview: true, reason: "contradiction_hold",
      }, prepared: { cycle: { routeAbstained: false } },
    } as never);
    const prepared = await h.prepare({
      features: { ...flags, cognitivePreviewEnabled: true },
    });
    expect(prepared.status).toBe("held");
    expect(prepared.arkLayer.continuity.currentGoal).toBe("Finish Grove");
    const response = await respondToVerifiedPrivateGroveTurn({
      prepared, features: flags, dependencies: h.dependencies,
    });
    expect(response).toEqual({
      status: "held", reason: "contradiction_hold",
      grantsExecution: false, verifiesCompletion: false,
    });
    expect(h.sendModel).not.toHaveBeenCalled();
  });

  it("unprovisioned learning and abstention cannot silently claim cognitive success", async () => {
    const h = harness();
    h.previewCognitive.mockResolvedValueOnce({
      status: "not_provisioned",
    } as never);
    const unavailable = await h.prepare({
      features: { ...flags, cognitivePreviewEnabled: true },
    });
    expect(unavailable).toMatchObject({
      status: "held", holdReason: "cognitive_not_provisioned",
    });
    h.previewCognitive.mockResolvedValueOnce({
      status: "ready",
      roundabout: { decision: "continue", requiresReview: false,
        reason: "normal_progress" },
      prepared: { cycle: { routeAbstained: true } },
    } as never);
    const uncertain = await h.prepare({
      features: { ...flags, cognitivePreviewEnabled: true },
    });
    expect(uncertain.status).toBe("held");
    expect(h.sendModel).not.toHaveBeenCalled();
  });

  it("cognitive read for another owner/turn fails before model transport", async () => {
    const h = harness();
    h.readCognitiveHost.mockImplementationOnce(async () => ({
      host: { userId: uuids.grove, projectId: uuids.project,
        conversationId: uuids.conversation, turnId: uuids.owner },
    } as never));
    await expect(h.prepare({
      features: { ...flags, cognitivePreviewEnabled: true },
    })).rejects.toMatchObject({
      status: 409, code: "grove_cognitive_scope_mismatch",
    });
    expect(h.retrieve).not.toHaveBeenCalled();
    expect(h.sendModel).not.toHaveBeenCalled();
  });
});

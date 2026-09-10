import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ChatTurnStore,
  ConversationRecord,
  TurnMessageRecord,
} from "@/lib/chat/turnPersistence";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  assertProjectOwnedByUser: vi.fn(),
  assertConversationOwnedByUser: vi.fn(),
  openAIChat: vi.fn(),
  runOpenAIAgencyAgent: vi.fn(),
  buildArborAgencyTools: vi.fn(),
  timelineCreate: vi.fn(),
  timelineRecord: vi.fn(),
  beginAgencySession: vi.fn(),
  recordAgencyProgress: vi.fn(),
  blockAgencySession: vi.fn(),
  completeAgencySession: vi.fn(),
  beginRuntimeSession: vi.fn(),
  updateRuntimeSession: vi.fn(),
  buildPromptContext: vi.fn(),
  extractMemoryFromText: vi.fn(),
  persistClassifiedMemoryTurn: vi.fn(),
  reinforceMemoryUse: vi.fn(),
  postcheckResponse: vi.fn(),
  writeDurableChatCompletedEvent: vi.fn(),
  logDecisionOutcome: vi.fn(),
  promoteIdentityAnchors: vi.fn(),
  createSupabaseChatTurnStore: vi.fn(),
  getOrCreateOpenEpisode: vi.fn(),
  buildTelemetry: vi.fn(),
  scheduleChatPostResponseWork: vi.fn(),
}));

vi.mock("@/lib/auth/requireUser", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mocks.assertProjectOwnedByUser,
  assertConversationOwnedByUser: mocks.assertConversationOwnedByUser,
}));
vi.mock("@/lib/providers/openai", () => ({
  openAIChat: mocks.openAIChat,
}));
vi.mock("@/lib/arbor/agency/openaiAgent", () => ({
  runOpenAIAgencyAgent: mocks.runOpenAIAgencyAgent,
}));
vi.mock("@/lib/arbor/agency/arborTools", () => ({
  buildArborAgencyTools: mocks.buildArborAgencyTools,
}));
vi.mock("@/lib/arbor/timeline/runTimeline", () => ({
  ArborTimeline: {
    create: mocks.timelineCreate,
  },
}));
vi.mock("@/lib/arbor/timeline/supabaseStore", () => ({
  SupabaseTimelineStore: class SupabaseTimelineStore {},
}));
vi.mock("@/lib/arbor/agency/session", () => ({
  beginAgencySession: mocks.beginAgencySession,
  recordAgencyProgress: mocks.recordAgencyProgress,
  blockAgencySession: mocks.blockAgencySession,
  completeAgencySession: mocks.completeAgencySession,
}));
vi.mock("@/lib/arbor/runtime/runtimeSession", () => ({
  beginRuntimeSession: mocks.beginRuntimeSession,
  updateRuntimeSession: mocks.updateRuntimeSession,
}));
vi.mock("@/lib/prompt/buildPromptContext", () => ({
  buildPromptContext: mocks.buildPromptContext,
}));
vi.mock("@/lib/memory/extractor", () => ({
  extractMemoryFromText: mocks.extractMemoryFromText,
}));
vi.mock("@/lib/memory/correctionResolution", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/memory/correctionResolution")
  >();
  return {
    ...actual,
    persistClassifiedMemoryTurn: mocks.persistClassifiedMemoryTurn,
  };
});
vi.mock("@/lib/memory/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/memory/store")>();
  return {
    ...actual,
    reinforceMemoryUse: mocks.reinforceMemoryUse,
  };
});
vi.mock("@/lib/safety/postcheck", () => ({
  postcheckResponse: mocks.postcheckResponse,
}));
vi.mock("@/lib/memory/durableEvents", () => ({
  writeDurableChatCompletedEvent: mocks.writeDurableChatCompletedEvent,
}));
vi.mock("@/lib/safety/decisionOutcome", () => ({
  logDecisionOutcome: mocks.logDecisionOutcome,
}));
vi.mock("@/lib/memory/promoteIdentityAnchors", () => ({
  promoteIdentityAnchors: mocks.promoteIdentityAnchors,
}));
vi.mock("@/lib/chat/turnPersistence", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/chat/turnPersistence")
  >();
  return {
    ...actual,
    createSupabaseChatTurnStore: mocks.createSupabaseChatTurnStore,
  };
});
vi.mock("@/lib/arbor/episodes/getOrCreateOpenEpisode", () => ({
  getOrCreateOpenEpisode: mocks.getOrCreateOpenEpisode,
}));
vi.mock("@/lib/arbor/telemetry/buildTelemetry", () => ({
  buildTelemetry: mocks.buildTelemetry,
}));
vi.mock("@/lib/chat/postResponseScheduler", () => ({
  scheduleChatPostResponseWork: mocks.scheduleChatPostResponseWork,
}));

import { POST } from "@/app/api/chat/route";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const EPISODE_ID = "33333333-3333-4333-8333-333333333333";
const TURN_ID = "44444444-4444-4444-8444-444444444444";
const MEMORY_ID = "55555555-5555-4555-8555-555555555555";
const USER_TEXT =
  "Correction: the access phrase is Amber Quill, not Copper Lark.";

class MemoryTurnStore implements ChatTurnStore {
  readonly conversations = new Map<string, ConversationRecord>();
  readonly messages = new Map<string, TurnMessageRecord>();
  failNextAssistantInsert = false;

  async getConversation(id: string) {
    return this.conversations.get(id) ?? null;
  }

  async insertConversation(record: ConversationRecord) {
    if (this.conversations.has(record.id)) throw { code: "23505" };
    this.conversations.set(record.id, record);
  }

  async getMessage(id: string) {
    return this.messages.get(id) ?? null;
  }

  async insertMessage(record: TurnMessageRecord) {
    if (record.role === "assistant" && this.failNextAssistantInsert) {
      this.failNextAssistantInsert = false;
      throw new Error("private assistant insert failure");
    }
    if (this.messages.has(record.id)) throw { code: "23505" };
    this.messages.set(record.id, record);
  }
}

function supabaseStub() {
  const result = { data: [], error: null };
  const query: Record<string, unknown> = {};
  for (const method of [
    "delete",
    "select",
    "eq",
    "lt",
    "not",
    "is",
    "or",
    "order",
    "update",
  ]) {
    query[method] = vi.fn(() => query);
  }
  query.limit = vi.fn().mockResolvedValue(result);
  query.then = (
    resolve: (value: typeof result) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return {
    from: vi.fn(() => query),
  } as unknown as SupabaseClient;
}

function request() {
  return new Request("https://arbor.test/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      projectId: PROJECT_ID,
      turnId: TURN_ID,
      userText: USER_TEXT,
    }),
  });
}

function resolvedCorrection() {
  return {
    kind: "correction" as const,
    resolution: {
      status: "resolved" as const,
      canonical: {
        id: MEMORY_ID,
        key: "project.observatory.access_phrase",
      },
      staleAliases: [],
    },
    corrected: { id: MEMORY_ID, locked: false },
    supersededIds: [],
    upsert: { created: [], updated: [], locked: [], ignored: [] },
  };
}

describe("explicit correction request-path durability", () => {
  let turnStore: MemoryTurnStore;
  let capturedOperations: Record<string, () => Promise<unknown>> | null;

  beforeEach(() => {
    turnStore = new MemoryTurnStore();
    capturedOperations = null;
    const supabase = supabaseStub();
    mocks.requireUser.mockResolvedValue({ supabase, userId: USER_ID });
    mocks.assertProjectOwnedByUser.mockResolvedValue(undefined);
    mocks.assertConversationOwnedByUser.mockResolvedValue(undefined);
    mocks.createSupabaseChatTurnStore.mockReturnValue(turnStore);
    mocks.getOrCreateOpenEpisode.mockResolvedValue(EPISODE_ID);

    const agencyState = {
      goal: USER_TEXT,
      status: "active" as const,
      currentStep: 0,
      unresolvedWork: [],
      recurringWeaknesses: [],
      strategyNotes: [],
      blocker: null,
    };

    mocks.beginAgencySession.mockResolvedValue(agencyState);
    mocks.recordAgencyProgress.mockImplementation(async ({ agency }) => agency);
    mocks.blockAgencySession.mockImplementation(
      async ({ agency, blocker, unresolvedWork }) => ({
        ...agency,
        status: "blocked" as const,
        blocker,
        unresolvedWork,
      }),
    );
    mocks.completeAgencySession.mockImplementation(
      async ({ agency, verified }) => ({
        ...agency,
        status: verified ? "complete" as const : "active" as const,
        unresolvedWork: verified ? [] : agency.unresolvedWork,
      }),
    );

    const runtimeState = {
      schemaVersion: 1 as const,
      userId: USER_ID,
      projectId: PROJECT_ID,
      conversationId:
        "66666666-6666-4666-8666-666666666666",
      channel: "text" as const,
      activeSubsystem: "arbor" as const,
      currentGoal: USER_TEXT,
      lastMeaningfulUserTurn: USER_TEXT,
      lastMeaningfulArborTurn: null,
      agency: agencyState,
      corrections: [],
      behaviorProof: null,
      pendingSelfUpdate: null,
      createdAt:
        "2026-09-10T21:00:00.000Z",
      updatedAt:
        "2026-09-10T21:00:00.000Z",
    };

    mocks.beginRuntimeSession.mockResolvedValue(runtimeState);
    mocks.updateRuntimeSession.mockImplementation(
      async ({ state, ...updates }) => ({
        ...state,
        ...updates,
      }),
    );

    mocks.buildArborAgencyTools.mockReturnValue({});
    mocks.timelineRecord.mockResolvedValue(undefined);
    mocks.timelineCreate.mockResolvedValue({
      record: mocks.timelineRecord,
    });

    mocks.runOpenAIAgencyAgent.mockResolvedValue({
      status: "complete" as const,
      text: "Understood: Amber Quill.",
      responseId: "response-1",
      toolCalls: 0,
    });

    mocks.buildPromptContext.mockResolvedValue({
      systemPrompt: "Bounded system prompt",
      activeSubsystem: "arbor",
      behaviorProof: {
        schemaVersion: 1,
        contractVersion: "test",
        mode: "text",
        coreFingerprint: "core",
        continuityFingerprint: "continuity",
        projectionFingerprint: "projection",
      },
      injectedMemoryItems: [
        {
          id: MEMORY_ID,
          project_id: PROJECT_ID,
          key: "project.observatory.access_phrase",
          value: { value: "Copper Lark" },
          tier: "normal",
          scope: "project",
          user_trigger_only: false,
          importance: 8,
          confidence: 0.99,
          pinned: false,
          locked: false,
          status: "active",
          deleted_at: null,
          last_seen_at: null,
          last_reinforced_at: null,
          updated_at: null,
          content_text: "Copper Lark",
        },
      ],
    });
    mocks.postcheckResponse.mockResolvedValue({ approved: true });
    mocks.extractMemoryFromText.mockResolvedValue([]);
    mocks.persistClassifiedMemoryTurn.mockResolvedValue(resolvedCorrection());
    mocks.promoteIdentityAnchors.mockResolvedValue(undefined);
    mocks.reinforceMemoryUse.mockResolvedValue(undefined);
    mocks.writeDurableChatCompletedEvent.mockResolvedValue(undefined);
    mocks.logDecisionOutcome.mockResolvedValue(undefined);
    mocks.buildTelemetry.mockResolvedValue(undefined);
    mocks.scheduleChatPostResponseWork.mockImplementation(
      ({ operations }: { operations: Record<string, () => Promise<unknown>> }) => {
        capturedOperations = operations;
        return true;
      },
    );
  });

  it("does not make success returnable until the correction is durable", async () => {
    let releaseCorrection: (() => void) | null = null;
    const correctionGate = new Promise<void>((resolve) => {
      releaseCorrection = resolve;
    });
    let durableValue = "Copper Lark";
    mocks.persistClassifiedMemoryTurn.mockImplementation(async () => {
      await correctionGate;
      durableValue = "Amber Quill";
      return resolvedCorrection();
    });

    let settled = false;
    const responsePromise = POST(request()).finally(() => {
      settled = true;
    });
    await vi.waitFor(() => {
      expect(mocks.persistClassifiedMemoryTurn).toHaveBeenCalledTimes(1);
    });

    expect(settled).toBe(false);
    expect(durableValue).toBe("Copper Lark");
    expect(
      [...turnStore.messages.values()].filter(({ role }) => role === "assistant"),
    ).toHaveLength(0);
    expect(mocks.scheduleChatPostResponseWork).not.toHaveBeenCalled();

    releaseCorrection!();
    const response = await responsePromise;
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      assistantText: "Understood: Amber Quill.",
    });
    expect(durableValue).toBe("Amber Quill");
    expect(
      [...turnStore.messages.values()].filter(({ role }) => role === "assistant"),
    ).toHaveLength(1);
    expect(capturedOperations).not.toBeNull();
  });

  it("returns only a redacted non-success response when correction persistence fails", async () => {
    mocks.persistClassifiedMemoryTurn.mockRejectedValue(
      new Error("private database payload and bearer token"),
    );

    const response = await POST(request());
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toEqual({ ok: false, error: "server_error" });
    expect(body).not.toContain("private database payload");
    expect(body).not.toContain("bearer token");
    expect(
      [...turnStore.messages.values()].filter(({ role }) => role === "assistant"),
    ).toHaveLength(0);
    expect(mocks.scheduleChatPostResponseWork).not.toHaveBeenCalled();
  });

  it("fails conservatively before assistant persistence when resolution is unavailable", async () => {
    mocks.persistClassifiedMemoryTurn.mockResolvedValue({
      ...resolvedCorrection(),
      resolution: {
        status: "not_found",
        canonical: null,
        staleAliases: [],
      },
      corrected: null,
    });

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "correction_unresolved",
    });
    expect(
      [...turnStore.messages.values()].filter(({ role }) => role === "assistant"),
    ).toHaveLength(0);
    expect(mocks.scheduleChatPostResponseWork).not.toHaveBeenCalled();
  });

  it("does not reapply or reschedule an exact completed-turn retry", async () => {
    let correctionCount = 0;
    let aliasSupersessions = 0;
    let correctionEvents = 0;
    mocks.persistClassifiedMemoryTurn.mockImplementation(async () => {
      correctionCount += 1;
      aliasSupersessions += 1;
      correctionEvents += 1;
      return resolvedCorrection();
    });

    const first = await POST(request());
    const firstBody = await first.json();
    expect(first.status).toBe(200);
    expect(capturedOperations).not.toBeNull();

    await capturedOperations!.memory_pipeline();
    expect(mocks.persistClassifiedMemoryTurn).toHaveBeenCalledTimes(1);
    expect(mocks.writeDurableChatCompletedEvent).toHaveBeenCalledTimes(1);

    const retry = await POST(request());
    const retryBody = await retry.json();

    expect(retry.status).toBe(200);
    expect(retryBody).toEqual(firstBody);
    expect(correctionCount).toBe(1);
    expect(aliasSupersessions).toBe(1);
    expect(correctionEvents).toBe(1);
    expect(mocks.persistClassifiedMemoryTurn).toHaveBeenCalledTimes(1);
    expect(mocks.runOpenAIAgencyAgent).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleChatPostResponseWork).toHaveBeenCalledTimes(1);
    expect(mocks.writeDurableChatCompletedEvent).toHaveBeenCalledTimes(1);
    expect(turnStore.messages).toHaveLength(2);
  });

  it("does not increment again when retry follows a post-correction assistant insert failure", async () => {
    let correctionCount = 0;
    let correctionAlreadyDurable = false;
    mocks.persistClassifiedMemoryTurn.mockImplementation(async () => {
      if (!correctionAlreadyDurable) {
        correctionAlreadyDurable = true;
        correctionCount += 1;
        return resolvedCorrection();
      }
      return {
        ...resolvedCorrection(),
        resolution: {
          ...resolvedCorrection().resolution,
          status: "already_applied" as const,
        },
      };
    });
    turnStore.failNextAssistantInsert = true;

    const failed = await POST(request());
    expect(failed.status).toBe(500);
    expect(await failed.json()).toEqual({ ok: false, error: "server_error" });
    expect(correctionCount).toBe(1);
    expect(mocks.scheduleChatPostResponseWork).not.toHaveBeenCalled();

    const retry = await POST(request());
    expect(retry.status).toBe(200);
    expect(await retry.json()).toMatchObject({
      ok: true,
      assistantText: "Understood: Amber Quill.",
    });
    expect(correctionCount).toBe(1);
    expect(mocks.persistClassifiedMemoryTurn).toHaveBeenCalledTimes(2);
    expect(mocks.scheduleChatPostResponseWork).toHaveBeenCalledTimes(1);
    expect(turnStore.messages).toHaveLength(2);
  });
});

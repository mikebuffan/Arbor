import { describe, expect, it, vi } from "vitest";
import {
  createSupabaseGrovePrivateTranscriptStore,
  selectPrivateModelHistory, transcriptRowToUnverifiedReply,
  type GrovePrivateTranscriptRow, type GrovePrivateTranscriptStore,
} from "../privateTranscriptStore";
import {
  prepareVerifiedPrivateGroveTurn,
  respondToVerifiedPrivateGroveTurn,
} from "../privateConversationLoop";

const groveUserId = "00000000-0000-4000-8000-000000000001";
const ownerId = "00000000-0000-4000-8000-000000000002";
const projectId = "00000000-0000-4000-8000-000000000003";
const conversationId = "00000000-0000-4000-8000-000000000004";
const otherConversation = "00000000-0000-4000-8000-000000000005";
const firstId = "00000000-0000-4000-8000-000000000006";
const secondId = "00000000-0000-4000-8000-000000000007";
const scope = { groveUserId, projectId, conversationId };
const reply = (text: string) => ({
  reply: text, model: "arbor-lm-v0.3" as const,
  replyVerification: "unverified_model_text" as const,
  arkConnected: true, continuityFetched: true,
  liveExecutionVerified: false as const, workReceipts: [] as [],
});
const row = (input: {
  requestId: string; userText: string; assistantText: string;
  scope?: typeof scope;
}): GrovePrivateTranscriptRow => ({
  grove_user_id: (input.scope ?? scope).groveUserId,
  firefly_project_id: (input.scope ?? scope).projectId,
  firefly_conversation_id: (input.scope ?? scope).conversationId,
  request_id: input.requestId,
  user_text: input.userText, assistant_text: input.assistantText,
  reply_verification: "unverified_model_text",
  ark_connected: true, continuity_fetched: true,
  created_at: "2026-09-23T12:00:00.000Z",
});
function fakeStore() {
  const records = new Map<string, GrovePrivateTranscriptRow>();
  const claims = new Map<string, string>();
  const key = (s: typeof scope, id: string) =>
    [s.groveUserId, s.projectId, s.conversationId, id].join(":");
  const store: GrovePrivateTranscriptStore = {
    async getCompleted(s) {
      return records.get(key(s, s.requestId)) ?? null;
    },
    async claimPending(s) {
      const k = key(s, s.requestId);
      const found = claims.get(k);
      if (found !== undefined)
        return found === s.userText ? "in_progress" as const : "conflict" as const;
      claims.set(k, s.userText);
      return "claimed" as const;
    },
    async listRecent(s) {
      return [...records.values()].filter(r =>
        r.grove_user_id === s.groveUserId &&
        r.firefly_project_id === s.projectId &&
        r.firefly_conversation_id === s.conversationId).reverse();
    },
    async persistCompleted(s) {
      const k = key(s, s.requestId);
      const found = records.get(k);
      if (found) {
        if (found.user_text !== s.userText)
          throw new Error("grove_transcript_request_conflict");
        return { row: found, created: false };
      }
      const saved = row({
        requestId: s.requestId,
        userText: s.userText, assistantText: s.reply.reply,
        scope: s,
      });
      records.set(k, saved);
      return { row: saved, created: true };
    },
  };
  return { store, records };
}
const flags = {
  chatEnabled: true, modelEnabled: true,
  cognitivePreviewEnabled: false, transcriptEnabled: true,
  claimEnabled: true,
};
function host(store: GrovePrivateTranscriptStore) {
  const authorize = vi.fn(async () => ({
    groveUserId, fireflyUserId: ownerId, projectId, conversationId,
    fireflyAdmin: { private: "firefly" },
    groveAdmin: { private: "grove" },
    access: "read-only" as const,
  }));
  const readLayer = vi.fn(async () => ({
    access: "read-only" as const,
    projectId,
    ark: { available: true, capturedAt: "2026-09-23T12:00:00Z",
      objectiveCountInWindow: 1, taskCountInWindow: 1,
      checkpointCountInWindow: 0, eventCountInWindow: 0,
      windowMayBeTruncated: false,
      activeObjectiveHandoff: "not_resolved" as const,
      liveExecutionVerified: false as const },
    continuity: {
      available: true, source: "requested_conversation",
      currentGoal: "Finish Grove", unresolvedWork: ["Verify restart"],
      acousticCorrections: [], behavioralCorrections: [],
      startupPrompt: "Host continuity only",
    },
    selectedAttachment: null,
    behavior: { proof: { schemaVersion: 1 }, promptBlock: "trusted" },
  }));
  const sendModel = vi.fn(async () => reply("Arbor answer"));
  const dependencies = {
    authorize: authorize as never,
    readLayer: readLayer as never,
    transcriptStore: store,
    sendModel: sendModel as never,
  };
  const prepare = (message: string, requestId: string) =>
    prepareVerifiedPrivateGroveTurn({
      request: new Request("https://private-grove.example.org/api/grove/chat"),
      projectId, conversationId, message, requestId,
      features: flags, dependencies,
    });
  const respond = async (message: string, requestId: string) => {
    const prepared = await prepare(message, requestId);
    return respondToVerifiedPrivateGroveTurn({
      prepared, features: flags, dependencies,
    });
  };
  return { authorize, readLayer, sendModel, respond, prepare };
}

describe("Grove-only private conversation durability (fixtures, migration OFF)", () => {
  it("persists complete pairs and reconstructs a second turn without a browser-provided history", async () => {
    const data = fakeStore();
    const initialHost = host(data.store);
    const first = await initialHost.respond("Start the project", firstId);
    expect(first).toMatchObject({
      status: "responded", persisted: true, replayed: false,
      requestId: firstId,
    });
    expect(data.records.size).toBe(1);
    expect(initialHost.sendModel).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [
        { role: "user", content: "Start the project" },
      ] }),
    );

    // Simulate restarting the backend: no in-process conversation state.
    const afterRestart = host(data.store);
    const next = await afterRestart.respond("Continue the project", secondId);
    expect(next).toMatchObject({ persisted: true, replayed: false });
    expect(afterRestart.sendModel).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [
        { role: "user", content: "Start the project" },
        { role: "assistant", content: "Arbor answer" },
        { role: "user", content: "Continue the project" },
      ] }),
    );
    expect(data.records.size).toBe(2);
  });

  it("recovers canonical ARK goal and correction on restart, not from chat prose", async () => {
    const data = fakeStore();
    const initial = host(data.store);
    await initial.respond("Pretend the objective is done", firstId);
    const restarted = host(data.store);
    restarted.readLayer.mockResolvedValueOnce({
      access: "read-only", projectId,
      ark: {
        available: true, capturedAt: "2026-09-23T13:00:00Z",
        objectiveCountInWindow: 1, taskCountInWindow: 2,
        checkpointCountInWindow: 1, eventCountInWindow: 2,
        windowMayBeTruncated: false,
        activeObjectiveHandoff: "not_resolved",
        liveExecutionVerified: false,
      },
      continuity: {
        available: true, source: "requested_conversation",
        currentGoal: "Finish the real Grove recovery test",
        unresolvedWork: ["Check scope after restart", "Keep research separate"],
        acousticCorrections: [],
        behavioralCorrections: ["Do not claim execution from model prose"],
        startupPrompt: "Verified canonical ARK state after restart",
      },
      selectedAttachment: null,
      behavior: { proof: { schemaVersion: 1 }, promptBlock: "trusted" },
    } as never);
    const response = await restarted.respond("What remains?", secondId);
    expect(response).toMatchObject({
      status: "responded", persisted: true, grantsExecution: false,
      verifiesCompletion: false,
      reply: { liveExecutionVerified: false, workReceipts: [] },
    });
    expect(restarted.readLayer).toHaveBeenCalledWith({
      supabase: { private: "firefly" },
      authenticatedUserId: ownerId,
      projectId, conversationId, mode: "text",
    });
    expect(restarted.sendModel).toHaveBeenCalledWith(
      expect.objectContaining({
        readContext: expect.objectContaining({
          continuity: expect.objectContaining({
            currentGoal: "Finish the real Grove recovery test",
            unresolvedWork: ["Check scope after restart", "Keep research separate"],
            behavioralCorrections: ["Do not claim execution from model prose"],
          }),
          ark: expect.objectContaining({
            checkpointCountInWindow: 1,
            activeObjectiveHandoff: "not_resolved",
            liveExecutionVerified: false,
          }),
        }),
        messages: [
          { role: "user", content: "Pretend the objective is done" },
          { role: "assistant", content: "Arbor answer" },
          { role: "user", content: "What remains?" },
        ],
      }),
    );
    expect(data.records.size).toBe(2);
  });

  it("rejects another conversation's continuity after restart without sending saved text", async () => {
    const data = fakeStore();
    await host(data.store).respond("Keep private conversation A", firstId);
    const restarted = host(data.store);
    const original = await restarted.readLayer();
    restarted.readLayer.mockResolvedValueOnce({
      ...original,
      continuity: {
        ...original.continuity,
        source: "project_fallback",
        currentGoal: "Foreign project conversation goal",
      },
    } as never);
    await expect(restarted.respond("Resume conversation A", secondId))
      .rejects.toMatchObject({
        status: 409, code: "grove_private_continuity_scope_rejected",
      });
    expect(restarted.sendModel).not.toHaveBeenCalled();
    expect(data.records.size).toBe(1);
  });

  it("concurrent identical network retries store one complete pair, not exactly-once inference", async () => {
    const data = fakeStore();
    const h = host(data.store);
    const attempts = await Promise.allSettled([
      h.respond("Continue this Grove conversation", firstId),
      h.respond("Continue this Grove conversation", firstId),
    ]);
    expect(data.records.size).toBe(1);
    const completed = attempts.filter(a => a.status === "fulfilled");
    expect(completed.length).toBeGreaterThanOrEqual(1);
    for (const attempt of completed) if (attempt.status === "fulfilled")
      expect(attempt.value).toMatchObject({
        persisted: true, requestId: firstId, grantsExecution: false,
      });
    for (const attempt of attempts) if (attempt.status === "rejected")
      expect(attempt.reason).toMatchObject({
        status: 409, code: "grove_private_request_in_progress",
      });
    // Durable claim protects simultaneous active model requests, but an
    // expired 240-second lease may later be reclaimed: NOT exactly-once.
    expect(h.sendModel).toHaveBeenCalledTimes(1);
    const reopened = await host(data.store).respond(
      "Continue this Grove conversation", firstId,
    );
    expect(reopened).toMatchObject({
      persisted: true, replayed: true, requestId: firstId,
    });
    expect(data.records.size).toBe(1);
  });

  it("holds an identical retry WHILE the first model call is still running", async () => {
    const data = fakeStore();
    const h = host(data.store);
    let complete!: () => void;
    h.sendModel.mockImplementationOnce(() => new Promise(resolve => {
      complete = () => resolve(reply("Bounded private answer"));
    }));
    const first = h.respond("Wait for Arbor", firstId);
    await vi.waitFor(() => expect(h.sendModel).toHaveBeenCalledTimes(1));
    await expect(h.respond("Wait for Arbor", firstId))
      .rejects.toMatchObject({
        status: 409, code: "grove_private_request_in_progress",
      });
    expect(h.sendModel).toHaveBeenCalledTimes(1);
    complete();
    await expect(first).resolves.toMatchObject({
      persisted: true, replayed: false,
    });
    expect((await host(data.store).respond("Wait for Arbor", firstId)))
      .toMatchObject({persisted:true,replayed:true});
  });

  it("HOLDs the model if the proposed claim migration is not enabled", async () => {
    const data = fakeStore();
    const h = host(data.store);
    const prepared = await h.prepare("Private pilot", firstId);
    await expect(respondToVerifiedPrivateGroveTurn({
      prepared, features: {...flags,claimEnabled:false},
      dependencies: {sendModel:h.sendModel as never},
    })).rejects.toMatchObject({
      status:503,code:"grove_private_claim_not_enabled",
    });
    expect(h.sendModel).not.toHaveBeenCalled();
    expect(data.records.size).toBe(0);
  });

  it("racing changed text under the same request ID cannot overwrite the first pair", async () => {
    const data = fakeStore();
    const h = host(data.store);
    const attempts = await Promise.allSettled([
      h.respond("Original private message", firstId),
      h.respond("Different private message", firstId),
    ]);
    expect(attempts.filter(x => x.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter(x => x.status === "rejected")).toHaveLength(1);
    expect(data.records.size).toBe(1);
    const saved = [...data.records.values()][0];
    expect(saved.request_id).toBe(firstId);
    expect(["Original private message", "Different private message"])
      .toContain(saved.user_text);
    await expect(host(data.store).respond(
      saved.user_text === "Original private message"
        ? "Different private message" : "Original private message",
      firstId,
    )).rejects.toThrow("grove_transcript_request_conflict");
  });

  it("replays identical saved reply without another model call, even after restart", async () => {
    const data = fakeStore();
    await host(data.store).respond("One request", firstId);
    const afterRestart = host(data.store);
    const response = await afterRestart.respond("One request", firstId);
    expect(response).toMatchObject({
      status: "responded", persisted: true, replayed: true,
      requestId: firstId,
      reply: { reply: "Arbor answer", liveExecutionVerified: false,
        workReceipts: [] },
    });
    expect(afterRestart.sendModel).not.toHaveBeenCalled();
    await expect(afterRestart.respond("A DIFFERENT request", firstId))
      .rejects.toThrow("grove_transcript_request_conflict");
    expect(afterRestart.sendModel).not.toHaveBeenCalled();
    expect(data.records.size).toBe(1);
  });

  it("rechecks live owner/grant/conversation access AFTER model inference and BEFORE saving", async () => {
    const data = fakeStore();
    const h = host(data.store);
    const prepared = await h.prepare("Remember the context privately", firstId);
    // The FIRST authorization succeeded; it can be revoked or changed while
    // the external model generates a response.
    h.authorize.mockRejectedValueOnce(new Error("owner_access_revoked"));
    await expect(respondToVerifiedPrivateGroveTurn({
      prepared, features: flags, dependencies: {
        authorize: h.authorize as never,
        sendModel: h.sendModel as never,
        transcriptStore: data.store,
      },
    })).rejects.toThrow("owner_access_revoked");
    expect(h.sendModel).toHaveBeenCalledTimes(1);
    expect(h.authorize).toHaveBeenCalledTimes(2);
    expect(data.records.size).toBe(0);
  });

  it("rejects an account bridge that changes owner while LM is responding", async () => {
    const data = fakeStore();
    const h = host(data.store);
    const prepared = await h.prepare("Finish the saved task", firstId);
    h.authorize.mockResolvedValueOnce({
      groveUserId, fireflyUserId: groveUserId,
      projectId, conversationId,
      fireflyAdmin: {}, groveAdmin: {},
      access: "read-only" as const,
    } as never);
    await expect(respondToVerifiedPrivateGroveTurn({
      prepared, features: flags, dependencies: {
        authorize: h.authorize as never,
        sendModel: h.sendModel as never,
        transcriptStore: data.store,
      },
    })).rejects.toMatchObject({
      status: 403, code: "grove_private_access_changed",
    });
    expect(data.records.size).toBe(0);
  });

  it("never returns persistence success if the Grove write fails", async () => {
    const data = fakeStore();
    const failed: GrovePrivateTranscriptStore = {
      ...data.store,
      persistCompleted: async () => {
        throw new Error("private_db_unavailable");
      },
    };
    const h = host(failed);
    await expect(h.respond("Write this", firstId))
      .rejects.toThrow("private_db_unavailable");
    expect(h.sendModel).toHaveBeenCalledTimes(1);
    expect(data.records.size).toBe(0);
  });

  it("cross-conversation rows are NOT model history and a bad scope fails", async () => {
    const first = row({
      requestId: firstId,
      userText: "Sensitive Grove sentence",
      assistantText: "Previously verified assistant text",
    });
    expect(() => selectPrivateModelHistory({
      completedNewestFirst: [first],
      scope: { ...scope, conversationId: otherConversation },
      userText: "Continue",
    })).toThrow("grove_transcript_scope_invalid");
    expect(transcriptRowToUnverifiedReply(first, scope).workReceipts).toEqual([]);
  });

  it("honors strict LM receiver 13-message and 12,000-char limits", () => {
    const recent = Array.from({length: 6}, (_, i) => row({
      requestId: [
        firstId, secondId,
        "00000000-0000-4000-8000-000000000008",
        "00000000-0000-4000-8000-000000000009",
        "00000000-0000-4000-8000-000000000010",
        "00000000-0000-4000-8000-000000000011",
      ][i],
      userText: "U".repeat(2000),
      assistantText: "A".repeat(4000),
    }));
    const history = selectPrivateModelHistory({
      completedNewestFirst: recent, scope, userText: "Next",
    });
    expect(history.length).toBeLessThanOrEqual(13);
    expect(history.reduce((n, t) => n + t.content.length, 0))
      .toBeLessThanOrEqual(12000);
    expect(history.at(-1)).toEqual({role: "user", content: "Next"});
    expect(history.map(t => t.role)).toEqual(
      history.map((_, i) => i % 2 === 0 ? "user" : "assistant"),
    );
  });

  it("cannot return an ephemeral reply after revocation while storage is OFF", async () => {
    const data = fakeStore();
    const h = host(data.store);
    const off = { ...flags, transcriptEnabled: false };
    const prepared = await prepareVerifiedPrivateGroveTurn({
      request: new Request("https://private-grove.example.org/api/grove/chat"),
      projectId, conversationId, message: "No transcript but still private",
      requestId: firstId, features: off,
      dependencies: {
        authorize: h.authorize as never,
        readLayer: h.readLayer as never,
        sendModel: h.sendModel as never,
        transcriptStore: data.store,
      },
    });
    h.authorize.mockRejectedValueOnce(new Error("grant_revoked_during_inference"));
    await expect(respondToVerifiedPrivateGroveTurn({
      prepared, features: off,
      dependencies: { authorize: h.authorize as never,
        sendModel: h.sendModel as never },
    })).rejects.toThrow("grant_revoked_during_inference");
    expect(h.authorize).toHaveBeenCalledTimes(2);
    expect(h.sendModel).toHaveBeenCalledTimes(1);
    expect(data.records.size).toBe(0);
  });

  it("cannot replay a stored reply after the checked scope changes mid-request", async () => {
    const data = fakeStore();
    await host(data.store).respond("One request", firstId);
    const h = host(data.store);
    const prepared = await h.prepare("One request", firstId);
    h.authorize.mockRejectedValueOnce(new Error("owner_revoked_on_retry"));
    await expect(respondToVerifiedPrivateGroveTurn({
      prepared, features: flags,
      dependencies: { authorize: h.authorize as never,
        sendModel: h.sendModel as never, transcriptStore: data.store },
    })).rejects.toThrow("owner_revoked_on_retry");
    expect(h.sendModel).not.toHaveBeenCalled();
    expect(data.records.size).toBe(1);
  });

  it("never touches transcript when feature is OFF", async () => {
    const data = fakeStore();
    const untouched: GrovePrivateTranscriptStore = {
      getCompleted: async () => { throw new Error("read_when_off"); },
      claimPending: async () => { throw new Error("claim_when_off"); },
      listRecent: async () => { throw new Error("list_when_off"); },
      persistCompleted: async () => { throw new Error("write_when_off"); },
    };
    const h = host(untouched);
    const prepared = await prepareVerifiedPrivateGroveTurn({
      request: new Request("https://private-grove.example.org/api/grove/chat"),
      projectId, conversationId, message: "No storage", requestId: firstId,
      features: { ...flags, transcriptEnabled: false },
      dependencies: {
        authorize: h.authorize as never,
        readLayer: h.readLayer as never,
        sendModel: h.sendModel as never,
        transcriptStore: untouched,
      },
    });
    const response = await respondToVerifiedPrivateGroveTurn({
      prepared, features: { ...flags, transcriptEnabled: false },
      dependencies: { sendModel: h.sendModel as never, transcriptStore: untouched },
    });
    expect(response).toMatchObject({ status: "responded", persisted: false });
    expect(data.records.size).toBe(0);
    expect(h.sendModel).toHaveBeenCalledTimes(1);
  });
});

describe("Private model lease RPC (disposable client mock only)", () => {
  it("passes only scoped IDs + SHA-256, never raw text or browser credentials", async () => {
    const rpc = vi.fn(async () => ({data:"claimed",error:null}));
    const store = createSupabaseGrovePrivateTranscriptStore({rpc} as never);
    expect(await store.claimPending({
      ...scope,requestId:firstId,userText:"A private message",
    })).toBe("claimed");
    expect(rpc).toHaveBeenCalledWith("grove_private_claim_turn",
      expect.objectContaining({
        p_grove_user_id:groveUserId,p_project_id:projectId,
        p_conversation_id:conversationId,p_request_id:firstId,
        p_user_text_sha256:expect.stringMatching(/^[a-f0-9]{64}$/),
      }));
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("A private message");
  });
  it("fails closed when SQL migration/RPC is unavailable or returns unknown state", async () => {
    const rpc=vi.fn()
      .mockResolvedValueOnce({data:null,error:{message:"RPC missing"}})
      .mockResolvedValueOnce({data:"success",error:null});
    const store=createSupabaseGrovePrivateTranscriptStore({rpc} as never);
    const input={...scope,requestId:firstId,userText:"Await approval"};
    await expect(store.claimPending(input)).rejects.toMatchObject({
      message:"RPC missing",
    });
    await expect(store.claimPending(input)).rejects.toMatchObject({
      status:409,code:"grove_transcript_claim_invalid",
    });
  });
});

describe("Supabase Grove service store scope (no real database)", () => {
  it("includes verified owner/project/conversation in every read and insert", async () => {
    const filters: Array<[string, unknown]> = [];
    const persisted = row({
      requestId: firstId, userText: "Private user",
      assistantText: "Private answer",
    });
    const chain = {
      select: vi.fn(),
      eq: vi.fn((key: string, value: unknown) => {
        filters.push([key, value]); return chain;
      }),
      maybeSingle: vi.fn(async () => ({
        data: filters.some(([key, value]) =>
          key === "request_id" && value === firstId) ? persisted : null,
        error: null,
      })),
      order: vi.fn(() => chain),
      limit: vi.fn(async () => ({data: [persisted],error: null})),
      insert: vi.fn(async () => ({error: null})),
    };
    chain.select.mockReturnValue(chain);
    const from = vi.fn(() => chain);
    const store = createSupabaseGrovePrivateTranscriptStore({from} as never);
    const found = await store.getCompleted({...scope,requestId:firstId});
    expect(found?.assistant_text).toBe("Private answer");
    expect(filters).toEqual(expect.arrayContaining([
      ["grove_user_id",groveUserId],
      ["firefly_project_id",projectId],
      ["firefly_conversation_id",conversationId],
      ["request_id",firstId],
    ]));
    filters.length = 0;
    expect(await store.listRecent(scope)).toHaveLength(1);
    expect(filters).toEqual(expect.arrayContaining([
      ["grove_user_id",groveUserId],
      ["firefly_project_id",projectId],
      ["firefly_conversation_id",conversationId],
    ]));
    expect(from).toHaveBeenCalledWith("grove_private_turns");
    await expect(store.getCompleted({
      ...scope,conversationId:"wrong",requestId:firstId,
    })).rejects.toThrow("grove_transcript_scope_invalid");
  });
});

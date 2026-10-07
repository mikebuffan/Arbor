import { spawnSync } from "node:child_process";
import { sendPrivateGroveLmTurnFromVerifiedHost } from "@/lib/grove/privateLmHostTransport";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArborRuntimeState } from "@/lib/arbor/runtime/runtimeState";
import type { ArkReadSnapshot } from "@/lib/ark/readModel";

const mock = vi.hoisted(() => ({
  assertProjectOwnedByUser: vi.fn(),
  assertConversationOwnedByUser: vi.fn(),
  readArkProjectSnapshot: vi.fn(),
  loadLatestRuntimeState: vi.fn(),
  loadRuntimeState: vi.fn(),
  assertAttachmentOwnedByScope: vi.fn(),
  loadDurableBehaviorCorrections: vi.fn(),
  getMemoryContext: vi.fn(),
  getAlwaysIncludedMemoryAnchors: vi.fn(),
}));

vi.mock("@/lib/arbor/runtime/correctionPromotion", () => ({loadDurableBehaviorCorrections: mock.loadDurableBehaviorCorrections}));
vi.mock("@/lib/memory/retrieval", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/memory/retrieval")>(),
  getMemoryContext: mock.getMemoryContext, getAlwaysIncludedMemoryAnchors: mock.getAlwaysIncludedMemoryAnchors,
}));
vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mock.assertProjectOwnedByUser,
  assertConversationOwnedByUser: mock.assertConversationOwnedByUser,
}));
vi.mock("@/lib/attachments/scope", () => ({
  assertAttachmentOwnedByScope: mock.assertAttachmentOwnedByScope,
}));
vi.mock("@/lib/ark/readModel", () => ({
  readArkProjectSnapshot: mock.readArkProjectSnapshot,
}));
vi.mock("@/lib/arbor/runtime/runtimeStateStore", () => ({
  loadLatestRuntimeState: mock.loadLatestRuntimeState,
  loadRuntimeState: mock.loadRuntimeState,
}));

import { readArkLayerContext } from "../arkLayerReadContext";

const userId = "owner-a";
const projectId = "project-a";
const conversationId = "conversation-a";
const timestamp = "2026-09-21T22:00:00.000Z";

function state(change: Partial<ArborRuntimeState> = {}): ArborRuntimeState {
  return {
    schemaVersion: 1,
    userId,
    projectId,
    conversationId,
    channel: "text",
    activeSubsystem: "arbor",
    currentGoal: "Finish the scoped ARK integration",
    lastMeaningfulUserTurn: "Keep going.",
    lastMeaningfulArborTurn: "The checkpoint is saved.",
    agency: {
      goal: "Finish the scoped ARK integration",
      status: "checkpointed",
      currentStep: 2,
      unresolvedWork: ["Verify the next objective"],
      recurringWeaknesses: [],
      strategyNotes: [],
    },
    corrections: [
      {
        id: "behavior-1", kind: "behavior", value: "Do not restart the conversation.",
        source: "text", observedAt: timestamp, confidence: 1, protected: true,
      },
      {
        id: "acoustic-1", kind: "acoustic", value: "Avoid British accent drift.",
        source: "voice", observedAt: timestamp, confidence: 1, protected: true,
      },
    ],
    behaviorProof: null,
    pendingSelfUpdate: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...change,
  };
}

const snapshot: ArkReadSnapshot = {
  available: true,
  capturedAt: timestamp,
  objectives: [{ id: "objective-1", goal: "Private read only goal", status: "checkpointed" }],
  tasks: [{ id: "task-1", objective_id: "objective-1", status: "checkpointed" }],
  checkpoints: [{ id: "checkpoint-1", objective_id: "objective-1" }],
  events: [{ id: "event-1", objective_id: "objective-1" }],
};

describe("owner-scoped ARK -> Arbor Layer read crossing", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mock.loadDurableBehaviorCorrections.mockResolvedValue([]);
    mock.getAlwaysIncludedMemoryAnchors.mockResolvedValue([]);
    mock.getMemoryContext.mockResolvedValue({core: [], normal: [], sensitive: [], keysUsed: []});
    mock.assertProjectOwnedByUser.mockResolvedValue(undefined);
    mock.assertConversationOwnedByUser.mockResolvedValue(undefined);
    mock.readArkProjectSnapshot.mockResolvedValue(snapshot);
    mock.loadLatestRuntimeState.mockResolvedValue(state());
    mock.loadRuntimeState.mockResolvedValue(state());
    mock.assertAttachmentOwnedByScope.mockResolvedValue({
      id: "attachment-a", user_id: userId, project_id: projectId,
      conversation_id: conversationId, status: "uploaded",
      storage_bucket: "chat-attachments",
      storage_path: `${userId}/${projectId}/${conversationId}/attachment-a/example.pdf`,
    });
  });

  it("reads the exact owner/project/conversation without creating or executing work", async () => {
    const supabase = { sentinel: "read only test client" } as never;
    const result = await readArkLayerContext({
      supabase, authenticatedUserId: userId, projectId, conversationId, mode: "voice",
    });

    expect(mock.assertProjectOwnedByUser).toHaveBeenCalledWith(supabase, userId, projectId);
    expect(mock.assertConversationOwnedByUser).toHaveBeenCalledWith({
      supabase, userId, projectId, conversationId,
    });
    expect(mock.readArkProjectSnapshot).toHaveBeenCalledWith({
      supabase, userId, projectId, objectiveLimit: 20, eventLimit: 100,
    });
    expect(mock.loadRuntimeState).toHaveBeenCalledWith({
      supabase, userId, projectId, conversationId,
    });
    expect(mock.loadLatestRuntimeState).not.toHaveBeenCalled();
    expect(mock.assertAttachmentOwnedByScope).not.toHaveBeenCalled();
    expect(result.selectedAttachment).toBeNull();
    expect(result.access).toBe("read-only");
    expect(result.ark).toEqual({
      available: true, capturedAt: timestamp, objectiveCountInWindow: 1,
      taskCountInWindow: 1, checkpointCountInWindow: 1, eventCountInWindow: 1,
      windowMayBeTruncated: false, activeObjectiveHandoff: "not_resolved",
      liveExecutionVerified: false,
    });
    expect(result.continuity.source).toBe("requested_conversation");
    expect(result.continuity.currentGoal).toBe("Finish the scoped ARK integration");
    expect(result.continuity.unresolvedWork).toEqual(["Verify the next objective"]);
    expect(result.continuity.acousticCorrections).toEqual(["Avoid British accent drift."]);
    expect(result.continuity.behavioralCorrections).toEqual(["Do not restart the conversation."]);
    expect(result.behavior.promptBlock).toContain("Interaction mode: voice");
    expect(result.behavior.promptBlock).toContain("Finish the scoped ARK integration");
    expect(result.behavior.promptBlock).toContain("Do not restart the conversation.");
    expect(result.behavior.promptBlock).not.toContain("Avoid British accent drift.");
    expect(result.behavior.promptBlock).not.toContain("Private read only goal");
    expect(result.behavior.guardRequirements).not.toContain("Verify the next objective");
    expect(result.behavior.guardRequirements).toContain("Do not restart the conversation.");
  });

  it("distinguishes project latest from a requested conversation and a fallback", async () => {
    const latest = await readArkLayerContext({
      supabase: {} as never, authenticatedUserId: userId, projectId, mode: "text",
    });
    expect(latest.continuity.source).toBe("project_latest");
    expect(mock.loadRuntimeState).not.toHaveBeenCalled();

    mock.loadRuntimeState.mockResolvedValue(state({ conversationId: "older-conversation" }));
    const fallback = await readArkLayerContext({
      supabase: {} as never, authenticatedUserId: userId, projectId, conversationId,
      mode: "text",
    });
    expect(fallback.continuity.source).toBe("project_fallback");
    expect(fallback.continuity.startupPrompt).toContain("Finish the scoped ARK integration");
  });

  it("rejects another user or project before ARK or continuity reads", async () => {
    mock.assertProjectOwnedByUser.mockRejectedValue(new Error("project_not_found"));
    await expect(readArkLayerContext({
      supabase: {} as never, authenticatedUserId: userId,
      projectId: "foreign-project", mode: "text",
    })).rejects.toThrow("project_not_found");
    expect(mock.assertConversationOwnedByUser).not.toHaveBeenCalled();
    expect(mock.readArkProjectSnapshot).not.toHaveBeenCalled();
    expect(mock.loadLatestRuntimeState).not.toHaveBeenCalled();
    expect(mock.loadDurableBehaviorCorrections).not.toHaveBeenCalled();
    expect(mock.getMemoryContext).not.toHaveBeenCalled();
  });

  it("rejects an unowned requested conversation before ARK or continuity reads", async () => {
    mock.assertConversationOwnedByUser.mockRejectedValue(new Error("conversation_not_found"));
    await expect(readArkLayerContext({
      supabase: {} as never, authenticatedUserId: userId,
      projectId, conversationId: "foreign-conversation", mode: "voice",
    })).rejects.toThrow("conversation_not_found");
    expect(mock.readArkProjectSnapshot).not.toHaveBeenCalled();
    expect(mock.loadRuntimeState).not.toHaveBeenCalled();
    expect(mock.loadDurableBehaviorCorrections).not.toHaveBeenCalled();
    expect(mock.getMemoryContext).not.toHaveBeenCalled();
  });

  it("fails closed when the stored JSON claims a different project or owner", async () => {
    for (const mismatch of [
      { userId: "foreign-owner" },
      { projectId: "foreign-project" },
    ]) {
      mock.loadLatestRuntimeState.mockResolvedValueOnce(state(mismatch));
      await expect(readArkLayerContext({
        supabase: {} as never, authenticatedUserId: userId,
        projectId, mode: "text",
      })).rejects.toThrow("ark_layer_continuity_scope_mismatch");
    }
  });

  it("marks ARK unavailable and continuity unavailable without inventing a status", async () => {
    mock.readArkProjectSnapshot.mockResolvedValue({
      ...snapshot, available: false, objectives: [], tasks: [], checkpoints: [], events: [],
    });
    mock.loadLatestRuntimeState.mockResolvedValue(null);
    const result = await readArkLayerContext({
      supabase: {} as never, authenticatedUserId: userId, projectId, mode: "text",
    });
    expect(result.ark.available).toBe(false);
    expect(result.ark.liveExecutionVerified).toBe(false);
    expect(result.continuity).toMatchObject({
      available: false, source: "unavailable", currentGoal: null,
      unresolvedWork: [], acousticCorrections: [], behavioralCorrections: [],
      startupPrompt: null,
    });
    expect(result.behavior.promptBlock).not.toContain("Finish the scoped ARK integration");
  });

  it("joins a file selected from Grove without pretending its bytes were read", async () => {
    const result = await readArkLayerContext({
      supabase: {} as never, authenticatedUserId: userId, projectId,
      conversationId, selectedAttachment: { conversationId, attachmentId: "attachment-a" },
      mode: "text",
    });
    expect(mock.assertAttachmentOwnedByScope).toHaveBeenCalledWith({
      supabase: {}, userId, projectId, conversationId, attachmentId: "attachment-a",
    });
    expect(result.selectedAttachment).toEqual({
      source: "chat_attachment_metadata",
      attachmentId: "attachment-a", projectId, conversationId,
      displayName: "example.pdf", originalBytesRead: false, citationVerified: false,
    });
    expect(JSON.stringify(result)).not.toContain("chat-attachments/");
    expect(result.behavior.promptBlock).not.toContain("example.pdf");
    expect(result.behavior.guardRequirements).not.toContain("example.pdf");
  });

  it("fails the whole read when selected file is not owned or was deleted", async () => {
    mock.assertAttachmentOwnedByScope.mockRejectedValueOnce(new Error("attachment_not_found"));
    await expect(readArkLayerContext({
      supabase: {} as never, authenticatedUserId: userId, projectId,
      conversationId: "foreign-conversation",
      selectedAttachment: { conversationId: "foreign-conversation", attachmentId: "other" },
      mode: "text",
    })).rejects.toThrow("attachment_not_found");

    mock.assertAttachmentOwnedByScope.mockResolvedValueOnce({
      status: "deleted",
      storage_path: "irrelevant",
    });
    await expect(readArkLayerContext({
      supabase: {} as never, authenticatedUserId: userId, projectId,
      conversationId, selectedAttachment: { conversationId, attachmentId: "attachment-a" },
      mode: "text",
    })).rejects.toMatchObject({ message: "attachment_not_found", status: 404 });
  });

  it("rejects selected file from another conversation before any DB read", async () => {
    await expect(readArkLayerContext({
      supabase: {} as never, authenticatedUserId: userId, projectId,
      conversationId,
      selectedAttachment: {
        conversationId: "other-owned-conversation", attachmentId: "attachment-a",
      },
      mode: "text",
    })).rejects.toMatchObject({ message: "attachment_not_found", status: 404 });
    expect(mock.assertProjectOwnedByUser).not.toHaveBeenCalled();
    expect(mock.assertConversationOwnedByUser).not.toHaveBeenCalled();
    expect(mock.assertAttachmentOwnedByScope).not.toHaveBeenCalled();
    expect(mock.readArkProjectSnapshot).not.toHaveBeenCalled();
    expect(mock.loadRuntimeState).not.toHaveBeenCalled();
  });

  it("requires an explicit requested conversation for a selected file", async () => {
    await expect(readArkLayerContext({
      supabase: {} as never, authenticatedUserId: userId, projectId,
      selectedAttachment: { conversationId, attachmentId: "attachment-a" },
      mode: "voice",
    })).rejects.toMatchObject({ message: "attachment_not_found", status: 404 });
    expect(mock.assertProjectOwnedByUser).not.toHaveBeenCalled();
    expect(mock.assertAttachmentOwnedByScope).not.toHaveBeenCalled();
    expect(mock.loadLatestRuntimeState).not.toHaveBeenCalled();
  });

  it("strips hostile control characters from selected file display names", async () => {
    mock.assertAttachmentOwnedByScope.mockResolvedValueOnce({
      status: "uploaded", storage_path: "scope/control\u0000file\u001fname.pdf",
    });
    const result = await readArkLayerContext({
      supabase: {} as never, authenticatedUserId: userId, projectId,
      conversationId, selectedAttachment: { conversationId, attachmentId: "attachment-a" },
      mode: "text",
    });
    expect(result.selectedAttachment?.displayName).toBe("controlfilename.pdf");
    expect(result.selectedAttachment?.originalBytesRead).toBe(false);
  });

  it("does not claim an exhaustive history when bounded read limits are reached", async () => {
    mock.readArkProjectSnapshot.mockResolvedValue({
      ...snapshot,
      objectives: Array.from({ length: 20 }, (_, id) => ({ id: String(id) })),
      events: Array.from({ length: 100 }, (_, id) => ({ id: String(id) })),
    });
    const result = await readArkLayerContext({
      supabase: {} as never, authenticatedUserId: userId, projectId, mode: "text",
    });
    expect(result.ark.objectiveCountInWindow).toBe(20);
    expect(result.ark.eventCountInWindow).toBe(100);
    expect(result.ark.windowMayBeTruncated).toBe(true);
  });
  it("preserves current identity and time within reviewed r3 schema bounds", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T01:47:30Z"));
    try {
      mock.loadRuntimeState.mockResolvedValueOnce(state({activeSubsystem: "annabelle"}));
      const context = await readArkLayerContext({
        supabase: {} as never, authenticatedUserId: userId, projectId,
        conversationId, mode: "text", timeZoneOffsetMinutes: -420,
      });
      const prompt = context.behavior.promptBlock;
      expect(prompt).toContain("ARBOR DURABLE IDENTITY ANCHOR");
      expect(prompt).toContain("local_date=2026-10-05");
      expect(prompt).toContain("local_time=18:47:30");
      expect(prompt).toContain("Authority: arbor");
      expect(prompt).not.toContain("Authority: annabelle");
      expect(prompt).toContain("Do not restart the conversation.");
      expect(prompt.indexOf("ARBOR DURABLE IDENTITY ANCHOR"))
        .toBeLessThan(prompt.indexOf("Mode projection:"));
      expect(context.behavior.proof.projectionFingerprint).toMatch(/^[a-f0-9]{64}$/);
      // Preserve the current baseline within the independently reviewed r3 schema.
      expect(prompt.length).toBeGreaterThan(12000);
      expect(prompt.length).toBeLessThanOrEqual(32768);
    } finally { vi.useRealTimers(); }
  });

  it("rejects the old One Arbor contract before contacting the reviewed receiver", async () => {
    const owner = "00000000-0000-4000-8000-000000000001";
    const project = "00000000-0000-4000-8000-000000000002";
    const conversation = "00000000-0000-4000-8000-000000000003";
    mock.loadRuntimeState.mockResolvedValueOnce(state({
      userId: owner, projectId: project, conversationId: conversation,
    }));
    const context = await readArkLayerContext({
      supabase: {} as never, authenticatedUserId: owner,
      projectId: project, conversationId: conversation, mode: "text",
    });
    expect(context.behavior.proof.contractVersion).toBe("2026-10-06.1");
    context.behavior.proof.contractVersion = "2026-09-21.1";
    const request = vi.fn();
    await expect(sendPrivateGroveLmTurnFromVerifiedHost({
      ownerId: owner, projectId: project, conversationId: conversation,
      readContext: context, messages: [{role: "user", content: "Synthetic acceptance"}],
    }, {config: {
      url: "https://synthetic-model.example.org",
      apiKey: "synthetic-server-only-api-key",
      hmacKey: "synthetic-host-only-hmac-key-over-32-characters",
    }, request})).rejects.toMatchObject({code: "private_lm_scope_rejected"});
    expect(request).not.toHaveBeenCalled();
  });

  it("hydrates permanent corrections without inventing conversation continuity", async () => {
    mock.loadRuntimeState.mockResolvedValue(null);
    mock.loadDurableBehaviorCorrections.mockResolvedValue([{...state().corrections[0],
      value: "Keep established humor during technical work", observedAt: "2026-10-06T00:00:00Z"}]);
    const result = await readArkLayerContext({supabase: {} as never,
      authenticatedUserId: userId, projectId, conversationId, mode: "text"});
    expect(result.continuity.available).toBe(false);
    expect(result.continuity.behavioralCorrections).toEqual([]);
    expect(result.behavior.guardRequirements).toContain("Keep established humor during technical work");
    expect(mock.loadDurableBehaviorCorrections).toHaveBeenCalledWith({supabase: {}, userId});
  });

  it("reuses scoped lexical memory and keeps sensitive/unrelated/foreign facts out of the prompt", async () => {
    const item = (id: string, text: string, change: Record<string, unknown> = {}) => ({
      id, key: "project.note", content_text: text, project_id: projectId, conversation_id: null,
      scope: "project", tier: "normal", pinned: false, locked: false, user_trigger_only: false,
      status: "active", deleted_at: null, excluded_from_memory: false, importance: 5,
      confidence: 0.75, ...change,
    });
    mock.getMemoryContext.mockResolvedValue({core: [], sensitive: [], keysUsed: [], normal: [
      item("relevant", "Grove receiver integration is pending"),
      item("unrelated", "Banana bread recipe"),
      item("foreign", "Grove receiver FOREIGN", {project_id: "other-project"}),
      item("sensitive", "Grove receiver SECRET", {tier: "sensitive", pinned: true}),
      item("excluded", "Grove receiver DELETED", {excluded_from_memory: true}),
    ]});
    const result = await readArkLayerContext({supabase: {} as never,
      authenticatedUserId: userId, projectId, conversationId, mode: "text",
      latestUserText: "Grove receiver integration"});
    expect(result.behavior.promptBlock).toContain("Grove receiver integration is pending");
    for (const forbidden of ["Banana bread", "FOREIGN", "SECRET", "DELETED"])
      expect(result.behavior.promptBlock).not.toContain(forbidden);
    expect(result.behavior.guardRequirements).not.toContain("Grove receiver integration is pending");
    expect(mock.getMemoryContext).toHaveBeenCalledWith(expect.objectContaining({
      authedUserId: userId, projectId, conversationId, useVectorSearch: false, useCache: false,
    }));
  });

  it("fails closed when permanent correction hydration fails", async () => {
    mock.loadDurableBehaviorCorrections.mockRejectedValue(new Error("synthetic_read_failure"));
    await expect(readArkLayerContext({supabase: {} as never, authenticatedUserId: userId,
      projectId, conversationId, mode: "text"})).rejects.toThrow("synthetic_read_failure");
    expect(mock.getMemoryContext).not.toHaveBeenCalled();
  });

  it.skipIf(!process.env.GROVE_LM_RECEIVER_SOURCE)(
    "passes the actual signed TS envelope through the preserved Python receiver (fake model only)",
    async () => {
      const owner = "00000000-0000-4000-8000-000000000001";
      const project = "00000000-0000-4000-8000-000000000002";
      const conversation = "00000000-0000-4000-8000-000000000003";
      mock.readArkProjectSnapshot.mockResolvedValueOnce({
        ...snapshot, capturedAt: new Date().toISOString(),
      });
      mock.loadRuntimeState.mockResolvedValueOnce(state({
        userId: owner, projectId: project, conversationId: conversation,
      }));
      mock.loadDurableBehaviorCorrections.mockResolvedValueOnce([{...state().corrections[0],
        id: "behavior:professional-humor", value: "Preserve professional casual humor during technical work",
        observedAt: "2026-10-06T00:00:00Z"}]);
      mock.getAlwaysIncludedMemoryAnchors.mockResolvedValueOnce([{
        id: "fixture-memory", key: "project.constraint", content_text: "The private Grove fixture has no external actions",
        scope: "project", project_id: project, conversation_id: null, tier: "core",
        status: "active", pinned: true, locked: false, user_trigger_only: false,
        excluded_from_memory: false, deleted_at: null, importance: 9, confidence: 1,
      }]);
      const context = await readArkLayerContext({
        supabase: {} as never, authenticatedUserId: owner,
        projectId: project, conversationId: conversation,
        mode: "text", timeZoneOffsetMinutes: -420,
      });
      const config = {
        url: "https://synthetic-model.example.org",
        apiKey: "synthetic-server-only-api-key",
        hmacKey: "synthetic-host-only-hmac-key-over-32-characters",
      };
      const request = async (_url: unknown, options?: RequestInit) => {
        const python = spawnSync(process.env.GROVE_TEST_PYTHON ?? "python3", ["-c", `
import json, os, sys
from fastapi.testclient import TestClient
from arbor_service.api import create_app
packet = json.load(sys.stdin)
os.environ["ARBOR_GROVE_API_KEY"] = packet["apiKey"]
os.environ["ARBOR_GROVE_BROKER_HMAC_KEY"] = packet["hmacKey"]
class FakeModel:
    ready = True
    def generate(self, *, system, messages, max_new_tokens):
        assert "ARBOR DURABLE IDENTITY ANCHOR" in system
        assert "Finish the scoped ARK integration" in system
        assert "Do not restart the conversation." in system
        assert "Preserve professional casual humor during technical work" in system
        assert "The private Grove fixture has no external actions" in system
        assert "time_zone=UTC-07:00" in system
        assert system.index("ARBOR DURABLE IDENTITY ANCHOR") < system.index("Mode projection:")
        assert messages[-1]["content"] == "Continue the fixture objective"
        if os.environ.get("GROVE_TOKENIZER_DIR"):
            from transformers import AutoTokenizer
            from pathlib import Path
            tokenizer = AutoTokenizer.from_pretrained(os.environ["GROVE_TOKENIZER_DIR"],
                local_files_only=True, trust_remote_code=False)
            ids = tokenizer.apply_chat_template([{"role":"system","content":system}] + messages,
                tokenize=True, add_generation_prompt=True, enable_thinking=False)
            # Tokenizer-only evidence; no model or weights are loaded.
            Path(os.environ["GROVE_OFFLINE_TOKEN_AUDIT"]).write_text(json.dumps({
                "input_tokens":len(ids), "system_characters":len(system),
                "tokenizer_declared_max_length":tokenizer.model_max_length,
                "default_2400_fits":len(ids)<=2400,
                "candidate_8192_fits":len(ids)+max_new_tokens<=8192,
                "real_inference":False}))
        return "Fixture context reached generation."
client = TestClient(create_app(model=FakeModel()))
response = client.post("/v1/grove/chat-with-host-context", content=packet["body"], headers=packet["headers"])
print(json.dumps({"status":response.status_code,"data":response.json()}))
`], {
          cwd: process.env.GROVE_LM_RECEIVER_SOURCE,
          input: JSON.stringify({body: options!.body, headers: options!.headers,
            apiKey: config.apiKey, hmacKey: config.hmacKey}), encoding: "utf8",
        });
        expect(python.status, python.stderr).toBe(0);
        const response = JSON.parse(python.stdout);
        expect(response.status).toBe(200);
        return Response.json(response.data, {status: response.status});
      };
      const reply = await sendPrivateGroveLmTurnFromVerifiedHost({
        ownerId: owner, projectId: project, conversationId: conversation,
        readContext: context,
        messages: [{role: "user", content: "Continue the fixture objective"}],
      }, {config, request: request as typeof fetch});
      expect(reply.reply).toBe("Fixture context reached generation.");
      expect(reply.liveExecutionVerified).toBe(false);
      expect(reply.workReceipts).toEqual([]);
    },
  );

});

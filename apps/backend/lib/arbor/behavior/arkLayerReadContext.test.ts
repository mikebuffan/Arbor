import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArborRuntimeState } from "@/lib/arbor/runtime/runtimeState";
import type { ArkReadSnapshot } from "@/lib/ark/readModel";

const mock = vi.hoisted(() => ({
  assertProjectOwnedByUser: vi.fn(),
  assertConversationOwnedByUser: vi.fn(),
  readArkProjectSnapshot: vi.fn(),
  loadLatestRuntimeState: vi.fn(),
  loadRuntimeState: vi.fn(),
}));

vi.mock("@/lib/auth/ownership", () => ({
  assertProjectOwnedByUser: mock.assertProjectOwnedByUser,
  assertConversationOwnedByUser: mock.assertConversationOwnedByUser,
}));
vi.mock("@/lib/ark/readModel", () => ({
  readArkProjectSnapshot: mock.readArkProjectSnapshot,
}));
vi.mock("@/lib/arbor/runtime/runtimeStateStore", () => ({
  loadLatestRuntimeState: mock.loadLatestRuntimeState,
  loadRuntimeState: mock.loadRuntimeState,
}));

import { readArkLayerContext } from "./arkLayerReadContext";

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
    mock.assertProjectOwnedByUser.mockResolvedValue(undefined);
    mock.assertConversationOwnedByUser.mockResolvedValue(undefined);
    mock.readArkProjectSnapshot.mockResolvedValue(snapshot);
    mock.loadLatestRuntimeState.mockResolvedValue(state());
    mock.loadRuntimeState.mockResolvedValue(state());
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
  });

  it("rejects an unowned requested conversation before ARK or continuity reads", async () => {
    mock.assertConversationOwnedByUser.mockRejectedValue(new Error("conversation_not_found"));
    await expect(readArkLayerContext({
      supabase: {} as never, authenticatedUserId: userId,
      projectId, conversationId: "foreign-conversation", mode: "voice",
    })).rejects.toThrow("conversation_not_found");
    expect(mock.readArkProjectSnapshot).not.toHaveBeenCalled();
    expect(mock.loadRuntimeState).not.toHaveBeenCalled();
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
});

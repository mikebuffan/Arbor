import { describe, expect, it } from "vitest";
import {
  assembleArborMemoryGatewaySnapshot,
} from "@/lib/arbor/memoryGateway";
import type { AgencyState } from "@/lib/arbor/agency/engine";
import type {
  ArborCorrection,
  ArborRuntimeState,
} from "@/lib/arbor/runtime/runtimeState";
import type {
  MemoryContextResult,
  RetrievedMemoryItem,
} from "@/lib/memory/retrieval";

function memory(input: Partial<RetrievedMemoryItem> & {
  id: string;
  key: string;
  content_text: string;
  tier: RetrievedMemoryItem["tier"];
}): RetrievedMemoryItem {
  return {
    id: input.id,
    project_id: input.project_id ?? "project-a",
    conversation_id: input.conversation_id ?? null,
    key: input.key,
    value: input.value ?? { text: input.content_text },
    tier: input.tier,
    scope: input.scope ?? "project",
    user_trigger_only: input.user_trigger_only ?? false,
    importance: input.importance ?? 8,
    confidence: input.confidence ?? 0.9,
    pinned: input.pinned ?? false,
    locked: input.locked ?? false,
    status: input.status ?? "active",
    deleted_at: input.deleted_at ?? null,
    last_seen_at: input.last_seen_at ?? null,
    last_reinforced_at: input.last_reinforced_at ?? null,
    updated_at: input.updated_at ?? "2026-09-14T23:00:00Z",
    similarity: input.similarity,
    content_text: input.content_text,
  };
}

function correction(
  id: string,
  value: string,
  observedAt: string,
): ArborCorrection {
  return {
    id,
    kind: "behavior",
    value,
    source: "text",
    observedAt,
    confidence: 1,
    protected: true,
  };
}

const agency: AgencyState = {
  goal: "finish Arbor memory plumbing",
  status: "active",
  currentStep: 4,
  unresolvedWork: [
    "connect the brain endpoint",
    "fresh-thread validation",
  ],
  recurringWeaknesses: [],
  strategyNotes: [],
  blocker: null,
};

const exactConversation: ArborRuntimeState = {
  schemaVersion: 1,
  userId: "user-a",
  projectId: "project-a",
  conversationId: "conversation-a",
  channel: "text",
  activeSubsystem: "arbor",
  currentGoal: "local wording check",
  lastMeaningfulUserTurn: null,
  lastMeaningfulArborTurn: null,
  agency: {
    ...agency,
    goal: "local wording check",
    unresolvedWork: [
      "fresh-thread validation",
      "verify exact conversation overlay",
    ],
  },
  corrections: [
    correction(
      "local-correction",
      "Do not make me repeat go.",
      "2026-09-14T23:05:00Z",
    ),
  ],
  behaviorProof: null,
  pendingSelfUpdate: null,
  createdAt: "2026-09-14T22:00:00Z",
  updatedAt: "2026-09-14T23:05:00Z",
};

const memoryContext: MemoryContextResult = {
  core: [
    memory({
      id: "identity",
      key: "arbor.identity.baseline",
      content_text: "One Arbor across tasks.",
      tier: "core",
      scope: "global",
      project_id: null,
      pinned: true,
    }),
  ],
  normal: [
    memory({
      id: "relevant",
      key: "arbor.memory.gateway",
      content_text: "Use the canonical memory gateway.",
      tier: "normal",
    }),
  ],
  sensitive: [
    memory({
      id: "sensitive",
      key: "private.sensitive",
      content_text: "must not leak",
      tier: "sensitive",
      user_trigger_only: true,
    }),
  ],
  keysUsed: [
    "arbor.identity.baseline",
    "arbor.memory.gateway",
    "private.sensitive",
  ],
};

describe("Arbor memory gateway assembly", () => {
  it("keeps the project carrier objective while preserving exact conversation state separately", () => {
    const snapshot = assembleArborMemoryGatewaySnapshot({
      projectId: "project-a",
      conversationId: "conversation-a",
      agency,
      exactConversation,
      projectCorrections: [
        correction(
          "project-correction",
          "Okay means continue active work.",
          "2026-09-14T23:00:00Z",
        ),
      ],
      memory: memoryContext,
    });

    expect(snapshot.activeObjective?.goal).toBe(
      "finish Arbor memory plumbing",
    );
    expect(snapshot.exactConversation?.currentGoal).toBe(
      "local wording check",
    );
  });

  it("merges cross-thread corrections and deduplicates open loops", () => {
    const snapshot = assembleArborMemoryGatewaySnapshot({
      projectId: "project-a",
      conversationId: "conversation-a",
      agency,
      exactConversation,
      projectCorrections: [
        correction(
          "project-correction",
          "Okay means continue active work.",
          "2026-09-14T23:00:00Z",
        ),
      ],
      memory: memoryContext,
    });

    expect(snapshot.corrections.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "project-correction",
        "local-correction",
      ]),
    );

    expect(snapshot.openLoops).toEqual([
      "connect the brain endpoint",
      "fresh-thread validation",
      "verify exact conversation overlay",
    ]);
  });

  it("returns identity and relevant memory but withholds sensitive content", () => {
    const snapshot = assembleArborMemoryGatewaySnapshot({
      projectId: "project-a",
      conversationId: "conversation-a",
      agency,
      exactConversation,
      projectCorrections: [],
      memory: memoryContext,
    });

    expect(snapshot.identityAnchors.map((item) => item.id)).toEqual([
      "identity",
    ]);
    expect(snapshot.relevantMemories.map((item) => item.id)).toEqual([
      "relevant",
    ]);
    expect(snapshot.sensitiveAvailableCount).toBe(1);

    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain("must not leak");
  });
});

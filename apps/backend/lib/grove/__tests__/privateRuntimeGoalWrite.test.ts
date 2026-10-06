import { describe, expect, it } from "vitest";
import { withRuntimeGoal } from "../privateRuntimeGoalWrite";
import type { ArborRuntimeState } from "@/lib/arbor/runtime/runtimeState";

const ids = {
  userId: "00000000-0000-4000-8000-000000000001",
  projectId: "00000000-0000-4000-8000-000000000002",
  conversationId: "00000000-0000-4000-8000-000000000003",
};

function prior(): ArborRuntimeState {
  return {
    schemaVersion: 1,
    ...ids,
    channel: "voice",
    activeSubsystem: "annabelle",
    currentGoal: "old goal",
    lastMeaningfulUserTurn: "keep this",
    lastMeaningfulArborTurn: "and this",
    agency: null,
    corrections: [{
      id: "c1",
      kind: "behavior",
      value: "keep going",
      source: "text",
      observedAt: "2026-10-06T10:00:00.000Z",
      confidence: 1,
      protected: true,
    }],
    behaviorProof: null,
    pendingSelfUpdate: null,
    createdAt: "2026-10-06T09:00:00.000Z",
    updatedAt: "2026-10-06T10:00:00.000Z",
  };
}

describe("bounded Grove runtime goal state", () => {
  it("changes only currentGoal and updatedAt on an existing exact state", () => {
    const before = prior();
    const after = withRuntimeGoal({
      prior: before,
      ...ids,
      goal: "new goal",
      now: "2026-10-06T11:00:00.000Z",
    });

    expect(after.currentGoal).toBe("new goal");
    expect(after.updatedAt).toBe("2026-10-06T11:00:00.000Z");
    expect({
      ...after,
      currentGoal: before.currentGoal,
      updatedAt: before.updatedAt,
    }).toEqual(before);
  });

  it("creates only a minimal exact conversation state when none exists", () => {
    const state = withRuntimeGoal({
      prior: null,
      ...ids,
      goal: "finish ARK spine",
      now: "2026-10-06T11:00:00.000Z",
    });

    expect(state).toMatchObject({
      schemaVersion: 1,
      ...ids,
      channel: "text",
      activeSubsystem: "arbor",
      currentGoal: "finish ARK spine",
      lastMeaningfulUserTurn: null,
      lastMeaningfulArborTurn: null,
      agency: null,
      corrections: [],
      behaviorProof: null,
      pendingSelfUpdate: null,
    });
  });

  it("refuses to copy a runtime state from another conversation", () => {
    expect(() => withRuntimeGoal({
      prior: { ...prior(), conversationId:
        "00000000-0000-4000-8000-000000000099" },
      ...ids,
      goal: "new goal",
      now: "2026-10-06T11:00:00.000Z",
    })).toThrow("scope_mismatch");
  });
});

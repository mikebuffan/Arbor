import { describe, expect, it } from "vitest";
import { withCapturedRuntimeTurn } from "../privateRuntimeTurnCapture";
import type { ArborRuntimeState } from "@/lib/arbor/runtime/runtimeState";

const scope = {
  userId: "00000000-0000-4000-8000-000000000001",
  projectId: "00000000-0000-4000-8000-000000000002",
  conversationId: "00000000-0000-4000-8000-000000000003",
};

function prior(): ArborRuntimeState {
  return {
    schemaVersion: 1,
    ...scope,
    channel: "voice",
    activeSubsystem: "annabelle",
    currentGoal: "Keep this goal",
    lastMeaningfulUserTurn: "old user",
    lastMeaningfulArborTurn: "old Arbor",
    agency: null,
    corrections: [{
      id: "c1",
      kind: "behavior",
      value: "preserve this correction",
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

describe("Grove exact-conversation runtime capture", () => {
  it("preserves goal, agency and corrections while capturing the verified text turn", () => {
    const before = prior();
    const after = withCapturedRuntimeTurn({
      prior: before,
      ...scope,
      userText: "New user turn",
      arborText: "New Arbor turn",
      now: "2026-10-06T11:00:00.000Z",
    });

    expect(after).toMatchObject({
      currentGoal: "Keep this goal",
      lastMeaningfulUserTurn: "New user turn",
      lastMeaningfulArborTurn: "New Arbor turn",
      channel: "text",
      activeSubsystem: "arbor",
      corrections: before.corrections,
      updatedAt: "2026-10-06T11:00:00.000Z",
    });
  });

  it("creates only the existing runtime schema when no exact row exists", () => {
    expect(withCapturedRuntimeTurn({
      prior: null,
      ...scope,
      userText: "Hello",
      arborText: "Hey",
      now: "2026-10-06T11:00:00.000Z",
    })).toMatchObject({
      schemaVersion: 1,
      ...scope,
      currentGoal: null,
      lastMeaningfulUserTurn: "Hello",
      lastMeaningfulArborTurn: "Hey",
      agency: null,
      corrections: [],
    });
  });

  it("bounds runtime continuity text without pretending it is the full transcript", () => {
    const state = withCapturedRuntimeTurn({
      prior: null,
      ...scope,
      userText: "u".repeat(4000),
      arborText: "a".repeat(4000),
      now: "2026-10-06T11:00:00.000Z",
    });

    expect(state.lastMeaningfulUserTurn?.length).toBeLessThanOrEqual(3000);
    expect(state.lastMeaningfulArborTurn?.length).toBeLessThanOrEqual(3000);
    expect(state.lastMeaningfulUserTurn).toContain("runtime capture truncated");
    expect(state.lastMeaningfulArborTurn).toContain("runtime capture truncated");
  });

  it("refuses to copy a different conversation's runtime row", () => {
    expect(() => withCapturedRuntimeTurn({
      prior: {
        ...prior(),
        conversationId: "00000000-0000-4000-8000-000000000099",
      },
      ...scope,
      userText: "Hello",
      arborText: "Hey",
      now: "2026-10-06T11:00:00.000Z",
    })).toThrow("scope_mismatch");
  });
});

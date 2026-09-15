import { describe, expect, it } from "vitest";

import {
  buildVoiceContinuityProjection,
} from "../continuityAdapter";
import type {
  ArborRuntimeState,
} from "../../runtime/runtimeState";

const runtimeState: ArborRuntimeState = {
  schemaVersion: 1,
  userId: "user-1",
  projectId: "project-1",
  conversationId: "conversation-1",
  channel: "text",
  activeSubsystem: "arbor",
  currentGoal: "finish the continuity bridge",
  lastMeaningfulUserTurn:
    "Keep going without waiting for me.",
  lastMeaningfulArborTurn:
    "I am still working the same line.",
  agency: {
    goal: "finish the continuity bridge",
    status: "active",
    currentStep: 3,
    unresolvedWork: [
      "wire Voice to canonical Arbor state",
    ],
    recurringWeaknesses: [],
    strategyNotes: [],
    blocker: null,
  },
  corrections: [
    {
      id: "behavior:continuity",
      kind: "behavior",
      value:
        "Text and Voice must feel like one Arbor, not two personalities.",
      source: "text",
      observedAt: "2026-09-14T19:00:00.000Z",
      confidence: 1,
      protected: true,
    },
    {
      id: "acoustic:accent",
      kind: "acoustic",
      value:
        "Use natural General American speech; avoid British accent drift.",
      source: "voice",
      observedAt: "2026-09-14T19:01:00.000Z",
      confidence: 1,
      protected: true,
    },
  ],
  behaviorProof: null,
  pendingSelfUpdate: null,
  createdAt: "2026-09-14T18:00:00.000Z",
  updatedAt: "2026-09-14T19:02:00.000Z",
};

describe("Voice continuity adapter", () => {
  it("projects Text Arbor onto Voice without mutating canonical state", () => {
    const before = structuredClone(runtimeState);

    const projection = buildVoiceContinuityProjection({
      text: "Yeah. Same line, same Arbor.",
      turnId: "turn-1",
      activeSubsystem: "arbor",
      runtimeState,
      subsystemAcousticCorrections: [
        "Keep phrase endings compact and natural.",
      ],
    });

    expect(runtimeState).toEqual(before);
    expect(runtimeState.channel).toBe("text");
    expect(projection.canonical.channel).toBe("voice");
    expect(projection.canonical.text).toBe(
      "Yeah. Same line, same Arbor.",
    );
    expect(projection.continuityAttached).toBe(true);
    expect(projection.hostState?.surface).toBe("voice");
    expect(projection.hostState?.currentGoal).toBe(
      runtimeState.currentGoal,
    );
    expect(projection.hostState?.lastMeaningfulUserTurn).toBe(
      runtimeState.lastMeaningfulUserTurn,
    );
    expect(projection.hostState?.lastMeaningfulArborTurn).toBe(
      runtimeState.lastMeaningfulArborTurn,
    );
  });

  it("keeps behavioral continuity in the host projection and acoustics in the renderer", () => {
    const projection = buildVoiceContinuityProjection({
      text: "Still me.",
      turnId: "turn-2",
      activeSubsystem: "arbor",
      runtimeState,
      subsystemAcousticCorrections: [
        "Keep phrase endings compact and natural.",
      ],
    });

    expect(projection.startup?.promptBlock).toContain(
      "finish the continuity bridge",
    );
    expect(projection.startup?.promptBlock).toContain(
      "wire Voice to canonical Arbor state",
    );
    expect(projection.startup?.promptBlock).toContain(
      "Text and Voice must feel like one Arbor, not two personalities.",
    );
    expect(projection.startup?.promptBlock).not.toContain(
      "Use natural General American speech; avoid British accent drift.",
    );

    expect(projection.acousticGate.corrections).toEqual([
      "Keep phrase endings compact and natural.",
      "Use natural General American speech; avoid British accent drift.",
    ]);
    expect(projection.acousticGate.instructions).toContain(
      "Use natural General American speech; avoid British accent drift.",
    );
  });

  it("still renders canonical text when durable continuity state is unavailable", () => {
    const projection = buildVoiceContinuityProjection({
      text: "Fallback, not a new personality.",
      turnId: "turn-3",
      activeSubsystem: "arbor",
      runtimeState: null,
    });

    expect(projection.continuityAttached).toBe(false);
    expect(projection.hostState).toBeNull();
    expect(projection.startup).toBeNull();
    expect(projection.canonical.text).toBe(
      "Fallback, not a new personality.",
    );
  });
});

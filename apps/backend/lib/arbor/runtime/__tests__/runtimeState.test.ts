import { describe, expect, it } from "vitest";

import {
  mergeCorrections,
  mergeCorrectionSnapshots,
  switchRuntimeChannel,
  switchRuntimeSubsystem,
  type ArborRuntimeState,
} from "../runtimeState";

const base: ArborRuntimeState = {
  schemaVersion: 1,

  userId: "u",
  projectId: "p",
  conversationId: "c",

  channel: "text",
  activeSubsystem: "arbor",

  currentGoal: "finish integration",

  lastMeaningfulUserTurn: "keep going",
  lastMeaningfulArborTurn: "found the route",

  agency: null,

  corrections: [],

  behaviorProof: null,
  pendingSelfUpdate: null,

  createdAt: "2026-09-10T20:00:00.000Z",
  updatedAt: "2026-09-10T20:00:00.000Z",
};

describe("shared Arbor runtime state", () => {
  it("does not count copied snapshot observations as new feedback and compares offset timestamps chronologically", () => {
    const earlier = { id: "behavior:drift", kind: "behavior" as const, value: "earlier",
      source: "text" as const, observedAt: "2026-10-01T09:00:00+02:00", confidence: 1, protected: true, occurrences: 3 };
    const later = { ...earlier, value: "later", observedAt: "2026-10-01T08:00:00Z", occurrences: 4 };
    const restored = mergeCorrectionSnapshots([[earlier], [later], [later]]);
    expect(restored).toEqual([later]);
    expect(mergeCorrectionSnapshots([restored, restored])).toEqual(restored);
  });
  it("keeps continuity when channel changes", () => {
    const voice = switchRuntimeChannel(
      base,
      "voice",
      "2026-09-10T20:01:00.000Z",
    );

    expect(voice.currentGoal).toBe(base.currentGoal);
    expect(voice.lastMeaningfulUserTurn).toBe(
      base.lastMeaningfulUserTurn,
    );
  });

  it("keeps continuity when Annabelle takes authority", () => {
    const annabelle = switchRuntimeSubsystem(
      base,
      "annabelle",
      "2026-09-10T20:02:00.000Z",
    );

    expect(annabelle.currentGoal).toBe(base.currentGoal);
    expect(annabelle.activeSubsystem).toBe("annabelle");
  });


  it("counts repeated correction families without duplicating them", () => {
    const corrections = mergeCorrections(
      [
        {
          id: "behavior:agency-followthrough",
          kind: "behavior",
          value: "Keep going without waiting for another prompt.",
          source: "text",
          observedAt: "2026-09-10T20:00:00.000Z",
          confidence: 1,
          protected: true,
          occurrences: 1,
        },
      ],
      [
        {
          id: "behavior:agency-followthrough",
          kind: "behavior",
          value: "Why did you stop? Keep going.",
          source: "text",
          observedAt: "2026-09-10T20:01:00.000Z",
          confidence: 1,
          protected: true,
          occurrences: 1,
        },
      ],
    );

    expect(corrections).toHaveLength(1);
    expect(corrections[0]).toMatchObject({
      id: "behavior:agency-followthrough",
      value: "Why did you stop? Keep going.",
      occurrences: 2,
    });
  });

  it("merges corrections without losing protected ones", () => {
    const corrections = mergeCorrections(
      [
        {
          id: "accent",
          kind: "acoustic",
          value: "General American, not British",
          source: "voice",
          observedAt: "2026-09-10T20:00:00.000Z",
          confidence: 1,
          protected: true,
        },
      ],
      [
        {
          id: "ack",
          kind: "behavior",
          value: "Do not collapse into one-word acknowledgments",
          source: "text",
          observedAt: "2026-09-10T20:01:00.000Z",
          confidence: 1,
          protected: true,
        },
      ],
    );

    expect(corrections.map((item) => item.id)).toEqual([
      "accent",
      "ack",
    ]);
  });
});

import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  ArborRuntimeState,
} from "../../runtime/runtimeState";

import {
  prioritizeCorrections,
  projectRuntimeMemory,
} from "../runtimeMemoryProjection";

function runtime(): ArborRuntimeState {
  return {
    schemaVersion: 1,
    userId: "user-1",
    projectId: "project-1",
    conversationId: "conversation-2",
    channel: "text",
    activeSubsystem: "arbor",
    currentGoal:
      "repair longitudinal memory",
    lastMeaningfulUserTurn:
      "keep it linear",
    lastMeaningfulArborTurn:
      "continuing the repair",
    agency: {
      goal:
        "repair longitudinal memory",
      status: "active",
      currentStep: 8,
      unresolvedWork: [
        "verify voice continuity",
        "verify voice continuity",
        "run linearity proof",
      ],
      recurringWeaknesses: [
        "required repeated go prompts",
      ],
      strategyNotes: [
        "carry active goals by default",
      ],
      blocker: null,
    },
    corrections: [
      {
        id: "old",
        kind: "behavior",
        value:
          "Do not require repeated go prompts",
        source: "text",
        observedAt:
          "2026-09-10T20:00:00.000Z",
        confidence: 0.8,
        protected: true,
      },
      {
        id: "new",
        kind: "behavior",
        value:
          "Do not require repeated go prompts",
        source: "text",
        observedAt:
          "2026-09-13T19:00:00.000Z",
        confidence: 1,
        protected: true,
      },
      {
        id: "voice",
        kind: "acoustic",
        value:
          "General American, not British",
        source: "voice",
        observedAt:
          "2026-09-13T19:01:00.000Z",
        confidence: 1,
        protected: true,
      },
    ],
    behaviorProof: null,
    pendingSelfUpdate: null,
    createdAt:
      "2026-09-13T18:00:00.000Z",
    updatedAt:
      "2026-09-13T19:02:00.000Z",
  };
}

describe(
  "longitudinal runtime memory projection",
  () => {
    it(
      "prefers the newest exact correction without erasing distinct evidence",
      () => {
        const corrections =
          prioritizeCorrections(
            runtime().corrections,
          );

        expect(
          corrections.map(
            (item) => item.id,
          ),
        ).toEqual([
          "voice",
          "new",
        ]);
      },
    );

    it(
      "deduplicates noisy unresolved state while preserving current state",
      () => {
        const projected =
          projectRuntimeMemory(
            runtime(),
          );

        expect(
          projected.currentGoal,
        ).toBe(
          "repair longitudinal memory",
        );

        expect(
          projected.unresolvedWork,
        ).toEqual([
          "verify voice continuity",
          "run linearity proof",
        ]);

        expect(
          projected.retainedStrategies,
        ).toEqual([
          "carry active goals by default",
        ]);
      },
    );
  },
);

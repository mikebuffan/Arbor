import {
  describe,
  expect,
  it,
} from "vitest";

import {
  projectRuntimeHost,
} from "../runtimeProjection";

const input = {
  sessionId: "turn-1",
  projectId: "project-1",
  conversationId: "conversation-1",
  activeSubsystem: "arbor" as const,
  acousticCorrections: [
    "General American, not British",
  ],
  behavioralCorrections: [
    "Do not collapse into one-word acknowledgments",
  ],
  behaviorProof: null,
  updatedAt: "2026-09-10T21:00:00.000Z",
  continuity: {
    currentGoal: "Align Text and Voice",
    lastMeaningfulUserTurn: "There is still a disconnect.",
    lastMeaningfulArborTurn: "I found it.",
    unresolvedWork: [
      "verify live Voice continuity",
    ],
    recurringWeaknesses: [],
    retainedStrategies: [],
    activeCorrections: [],
    activeSubsystem: "arbor" as const,
    channel: "voice" as const,
  },
};

describe(
  "runtime to host projection",
  () => {
    it(
      "projects acoustic corrections into Voice while preserving behavioral corrections",
      () => {
        const result =
          projectRuntimeHost(input);

        expect(
          result.startup.promptBlock,
        ).toContain(
          "Do not collapse into one-word acknowledgments",
        );

        expect(
          result.startup.promptBlock,
        ).toContain(
          "VOICE RENDERING TARGET:",
        );

        expect(
          result.startup.promptBlock,
        ).toContain(
          "General American, not British",
        );

        expect(
          result.startup.acousticCorrections,
        ).toEqual([
          "General American, not British",
        ]);
      },
    );

    it(
      "keeps acoustic corrections out of Text host prompting",
      () => {
        const result =
          projectRuntimeHost({
            ...input,
            continuity: {
              ...input.continuity,
              channel: "text",
            },
          });

        expect(
          result.startup.promptBlock,
        ).toContain(
          "Do not collapse into one-word acknowledgments",
        );

        expect(
          result.startup.promptBlock,
        ).not.toContain(
          "VOICE RENDERING TARGET:",
        );

        expect(
          result.startup.promptBlock,
        ).not.toContain(
          "General American, not British",
        );

        expect(
          result.startup.acousticCorrections,
        ).toEqual([
          "General American, not British",
        ]);
      },
    );
  },
);

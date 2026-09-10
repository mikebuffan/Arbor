import {
  describe,
  expect,
  it,
} from "vitest";

import {
  projectRuntimeHost,
} from "../runtimeProjection";

describe(
  "runtime to host projection",
  () => {
    it(
      "keeps acoustic corrections out of the behavioral prompt",
      () => {
        const result =
          projectRuntimeHost({
            sessionId:
              "turn-1",
            projectId:
              "project-1",
            conversationId:
              "conversation-1",
            activeSubsystem:
              "arbor",
            acousticCorrections: [
              "General American, not British",
            ],
            behavioralCorrections: [
              "Do not collapse into one-word acknowledgments",
            ],
            behaviorProof:
              null,
            updatedAt:
              "2026-09-10T21:00:00.000Z",
            continuity: {
              currentGoal:
                "Align Text and Voice",
              lastMeaningfulUserTurn:
                "There is still a disconnect.",
              lastMeaningfulArborTurn:
                "I found it.",
              unresolvedWork: [
                "verify live Voice continuity",
              ],
              recurringWeaknesses:
                [],
              retainedStrategies:
                [],
              activeCorrections:
                [],
              activeSubsystem:
                "arbor",
              channel:
                "voice",
            },
          });

        expect(
          result.startup
            .promptBlock,
        ).toContain(
          "Do not collapse into one-word acknowledgments",
        );

        expect(
          result.startup
            .promptBlock,
        ).not.toContain(
          "General American, not British",
        );

        expect(
          result.startup
            .acousticCorrections,
        ).toEqual([
          "General American, not British",
        ]);
      },
    );
  },
);

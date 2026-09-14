import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildContinuityCheckpoint,
} from "./continuityCheckpoint.js";
import type {
  AgencyResult,
} from "./agency.js";
import type {
  ArborState,
} from "./types.js";

function state(
  overrides:
    Partial<ArborState> = {},
): ArborState {
  return {
    activeSubsystem:
      "arbor",
    goal:
      "restore Arbor",
    unresolvedWork: [
      "ordinary note",
      "current priority: finish cognition integration",
    ],
    strategyNotes: [],
    behavioralCorrections: [
      "do not narrate instead of acting",
    ],
    acousticCorrections: [],
    voiceId:
      "cedar",
    ...overrides,
  };
}

function completeAgency(
  current:
    ArborState,
): AgencyResult {
  return {
    status:
      "complete",
    text:
      "candidate",
    state:
      current,
    rounds:
      1,
    toolCalls:
      0,
    researchCalls:
      0,
  };
}

describe(
  "continuity checkpoint",
  () => {
    it(
      "records exact next work and keeps active unfinished state resumable",
      () => {
        const current =
          state();

        const checkpoint =
          buildContinuityCheckpoint({
            state:
              current,
            agency:
              completeAgency(
                current,
              ),
            createdAt:
              "2026-09-14T20:40:00.000Z",
          });

        expect(
          checkpoint.status,
        ).toBe(
          "active",
        );

        expect(
          checkpoint.exactNextWork,
        ).toBe(
          "current priority: finish cognition integration",
        );

        expect(
          checkpoint.continueWithoutPrompt,
        ).toBe(
          true,
        );

        expect(
          checkpoint.behavioralCorrections,
        ).toEqual([
          "do not narrate instead of acting",
        ]);
      },
    );

    it(
      "marks a truly empty queue complete",
      () => {
        const current =
          state({
            unresolvedWork:
              [],
          });

        const checkpoint =
          buildContinuityCheckpoint({
            state:
              current,
            agency:
              completeAgency(
                current,
              ),
            createdAt:
              "2026-09-14T20:40:00.000Z",
          });

        expect(
          checkpoint.status,
        ).toBe(
          "complete",
        );

        expect(
          checkpoint.exactNextWork,
        ).toBeNull();

        expect(
          checkpoint.continueWithoutPrompt,
        ).toBe(
          false,
        );
      },
    );

    it(
      "preserves an explicit agency blocker",
      () => {
        const current =
          state({
            unresolvedWork: [
              "requires user input: authorize deployment",
            ],
          });

        const blocked:
          AgencyResult = {
          status:
            "blocked",
          text:
            "Authorize deployment.",
          state:
            current,
          rounds:
            1,
          toolCalls:
            0,
          researchCalls:
            0,
          blocker:
            "authorization_required",
          capability:
            "deploy",
          requiredUserInput:
            "Authorize deployment.",
        };

        const checkpoint =
          buildContinuityCheckpoint({
            state:
              current,
            agency:
              blocked,
            createdAt:
              "2026-09-14T20:40:00.000Z",
          });

        expect(
          checkpoint.status,
        ).toBe(
          "blocked",
        );

        expect(
          checkpoint.blockerReason,
        ).toBe(
          "authorization_required",
        );

        expect(
          checkpoint.continueWithoutPrompt,
        ).toBe(
          false,
        );
      },
    );
  },
);

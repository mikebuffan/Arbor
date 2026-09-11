import {
  describe,
  expect,
  it,
} from "vitest";

import {
  addSelfModelObservation,
  summarizeSelfModelObservations,
} from "./selfModelObservations.js";
import type {
  ArborState,
} from "./types.js";

function state():
  ArborState {
  return {
    activeSubsystem:
      "arbor",
    goal:
      null,
    unresolvedWork:
      [],
    strategyNotes:
      [],
    acousticCorrections:
      [],
    voiceId:
      "cedar",
  };
}

describe(
  "live self-model observations",
  () => {
    it(
      "promotes repeated cross-domain support to a review candidate without changing durable identity",
      () => {
        const first =
          addSelfModelObservation(
            state(),
            {
              targetKind:
                "pattern",
              targetId:
                "earned-humor",
              domain:
                "communication",
              verdict:
                "supports",
              evidence:
                "Dry callback humor landed in ordinary conversation.",
              confidence:
                0.9,
            },
          );

        const second =
          addSelfModelObservation(
            first,
            {
              targetKind:
                "pattern",
              targetId:
                "earned-humor",
              domain:
                "collaboration",
              verdict:
                "supports",
              evidence:
                "Humor remained specific during collaborative debugging.",
              confidence:
                0.9,
            },
          );

        const summary =
          summarizeSelfModelObservations(
            second,
          )[0];

        expect(
          summary?.status,
        ).toBe(
          "candidate",
        );

        expect(
          second.selfModel,
        ).toBeUndefined();
      },
    );

    it(
      "marks a target contested when contradictory evidence appears",
      () => {
        const first =
          addSelfModelObservation(
            state(),
            {
              targetKind:
                "pattern",
              targetId:
                "earned-humor",
              domain:
                "communication",
              verdict:
                "supports",
              evidence:
                "Specific dry humor.",
              confidence:
                0.9,
            },
          );

        const second =
          addSelfModelObservation(
            first,
            {
              targetKind:
                "pattern",
              targetId:
                "earned-humor",
              domain:
                "voice",
              verdict:
                "contradicts",
              evidence:
                "Voice became generic and forced.",
              confidence:
                0.95,
            },
          );

        expect(
          summarizeSelfModelObservations(
            second,
          )[0]
            ?.status,
        ).toBe(
          "contested",
        );
      },
    );

    it(
      "deduplicates identical evidence",
      () => {
        const input = {
          targetKind:
            "pattern" as const,
          targetId:
            "earned-humor",
          domain:
            "communication",
          verdict:
            "supports" as const,
          evidence:
            "Same observation.",
          confidence:
            0.9,
        };

        const first =
          addSelfModelObservation(
            state(),
            input,
          );

        const second =
          addSelfModelObservation(
            first,
            input,
          );

        expect(
          second
            .selfModelObservations,
        ).toHaveLength(
          1,
        );
      },
    );
  },
);

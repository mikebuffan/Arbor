import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildControlCapabilities,
} from "./controlCapabilities.js";

import type {
  ArborState,
} from "./types.js";

const baseState:
  ArborState = {
    activeSubsystem:
      "arbor",
    goal:
      "test",
    unresolvedWork:
      [],
    strategyNotes:
      [],
    acousticCorrections:
      [],
    voiceId:
      "cedar",
  };

describe(
  "control capabilities",
  () => {
    it(
      "reads current state without mutation",
      async () => {
        const registry =
          buildControlCapabilities();

        const capability =
          registry.get(
            "arbor_read_control_state",
          );

        const execution =
          await capability.execute(
            {},
            {
              projectId:
                "project-1",
              turnId:
                "turn-1",
              state:
                baseState,
            },
          );

        expect(
          execution.result,
        ).toEqual(
          baseState,
        );

        expect(
          execution.statePatch,
        ).toBeUndefined();
      },
    );

    it(
      "returns a voice-correction patch instead of mutating outside agency",
      async () => {
        const registry =
          buildControlCapabilities();

        const capability =
          registry.get(
            "arbor_append_voice_correction",
          );

        const execution =
          await capability.execute(
            {
              correction:
                "Avoid British accent drift.",
            },
            {
              projectId:
                "project-1",
              turnId:
                "turn-1",
              state:
                baseState,
            },
          );

        expect(
          execution.statePatch
            ?.acousticCorrections,
        ).toEqual([
          "Avoid British accent drift.",
        ]);

        expect(
          baseState
            .acousticCorrections,
        ).toEqual([]);
      },
    );

    it(
      "returns an Annabelle working-delta patch with previous value",
      async () => {
        const registry =
          buildControlCapabilities();

        const capability =
          registry.get(
            "annabelle_set_working_delta",
          );

        const execution =
          await capability.execute(
            {
              workingDelta:
                "New scene delta",
            },
            {
              projectId:
                "project-1",
              turnId:
                "turn-1",
              state: {
                ...baseState,
                activeSubsystem:
                  "annabelle",
                annabelle: {
                  canon:
                    [],
                  lockedPassages:
                    [],
                  sceneState:
                    [],
                  unresolvedDecisions:
                    [],
                  workingDelta:
                    "Old delta",
                },
              },
            },
          );

        expect(
          execution.result,
        ).toEqual({
          previous:
            "Old delta",
          current:
            "New scene delta",
        });

        expect(
          execution.statePatch
            ?.annabelle
            ?.workingDelta,
        ).toBe(
          "New scene delta",
        );
      },
    );
  },
);

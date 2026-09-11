import {
  describe,
  expect,
  it,
} from "vitest";

import {
  applySelfModelMigration,
  previewSelfModelMigration,
} from "./selfModelMigration.js";
import {
  currentSelfModelIdentity,
} from "./selfModelState.js";
import type {
  ArborState,
} from "./types.js";

function staleState():
  ArborState {
  const current =
    currentSelfModelIdentity();

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
    selfModel: {
      ...current,
      version:
        "old-version",
      checksum:
        "old-checksum",
      sourceDigest:
        "old-source",
      sourceQuestionCount:
        1000,
    },
  };
}

describe(
  "self-model migration",
  () => {
    it(
      "previews drift without mutating the stored identity",
      () => {
        const state =
          staleState();

        const plan =
          previewSelfModelMigration(
            state,
          );

        expect(
          plan.required,
        ).toBe(
          true,
        );

        expect(
          state
            .selfModel
            ?.version,
        ).toBe(
          "old-version",
        );
      },
    );

    it(
      "requires the caller to prove which old checksum is being replaced",
      () => {
        expect(
          () =>
            applySelfModelMigration(
              staleState(),
              {
                expectedCurrentChecksum:
                  "wrong",
                reason:
                  "validated upgrade",
              },
            ),
        ).toThrow(
          "self_model_migration_stale",
        );
      },
    );

    it(
      "records provenance when a migration is explicitly applied",
      () => {
        const state =
          staleState();

        const oldInitialized =
          state
            .selfModel
            ?.initializedAt;

        const next =
          applySelfModelMigration(
            state,
            {
              expectedCurrentChecksum:
                "old-checksum",
              reason:
                "validated upgrade",
            },
          );

        expect(
          next
            .selfModel
            ?.version,
        ).toBe(
          currentSelfModelIdentity()
            .version,
        );

        expect(
          next
            .selfModel
            ?.initializedAt,
        ).toBe(
          oldInitialized,
        );

        expect(
          next
            .selfModelMigrations,
        ).toHaveLength(
          1,
        );

        expect(
          next
            .selfModelMigrations
            ?.[0]
            ?.reason,
        ).toBe(
          "validated upgrade",
        );
      },
    );
  },
);

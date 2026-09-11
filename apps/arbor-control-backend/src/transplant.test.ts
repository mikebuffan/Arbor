import {
  mkdtemp,
} from "node:fs/promises";
import {
  tmpdir,
} from "node:os";
import {
  join,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ensureSelfModelIdentity,
} from "./selfModelState.js";
import {
  JsonFileArborStateStore,
} from "./stateStore.js";
import {
  createTransplantBundle,
  restoreTransplantSnapshot,
} from "./transplant.js";
import type {
  ArborState,
  StoredArborTurn,
} from "./types.js";

function baseState():
  ArborState {
  return ensureSelfModelIdentity({
    activeSubsystem:
      "arbor",
    goal:
      "keep continuity",
    unresolvedWork: [
      "finish integration",
    ],
    strategyNotes: [
      "verify before claiming completion",
    ],
    acousticCorrections: [
      "General American baseline",
    ],
    voiceId:
      "cedar",
  });
}

function turn(
  scope:
    string,
):
  StoredArborTurn {
  return {
    turnId:
      "turn-1",
    scope,
    requestFingerprint:
      "fingerprint-1",
    userText:
      "hello",
    createdAt:
      "2026-09-10T00:00:00.000Z",
    response: {
      text:
        "hello back",
      turnId:
        "turn-1",
      subsystem:
        "arbor",
      channel:
        "text",
      voice: {
        voiceId:
          "cedar",
        acousticCorrections: [],
      },
    },
  };
}

describe(
  "transplant and restart continuity",
  () => {
    it(
      "survives a fresh store instance using the same persistent file",
      async () => {
        const dir =
          await mkdtemp(
            join(
              tmpdir(),
              "arbor-restart-",
            ),
          );

        const file =
          join(
            dir,
            "state.json",
          );

        const first =
          new JsonFileArborStateStore(
            file,
          );

        const scope =
          "conversation:restart";

        await first.commitTurn(
          scope,
          baseState(),
          turn(
            scope,
          ),
        );

        const restarted =
          new JsonFileArborStateStore(
            file,
          );

        const loaded =
          await restarted.load(
            scope,
          );

        expect(
          loaded
            ?.selfModel
            ?.checksum,
        ).toBe(
          baseState()
            .selfModel
            ?.checksum,
        );

        expect(
          await restarted
            .recentMessages(
              scope,
            ),
        ).toHaveLength(
          2,
        );
      },
    );

    it(
      "exports, verifies, and restores a complete empty-target transplant",
      async () => {
        const sourceDir =
          await mkdtemp(
            join(
              tmpdir(),
              "arbor-source-",
            ),
          );

        const targetDir =
          await mkdtemp(
            join(
              tmpdir(),
              "arbor-target-",
            ),
          );

        const source =
          new JsonFileArborStateStore(
            join(
              sourceDir,
              "state.json",
            ),
          );

        const target =
          new JsonFileArborStateStore(
            join(
              targetDir,
              "state.json",
            ),
          );

        const scope =
          "conversation:transplant";

        await source.commitTurn(
          scope,
          baseState(),
          turn(
            scope,
          ),
        );

        const snapshot =
          await source.exportScope(
            scope,
          );

        const bundle =
          createTransplantBundle(
            snapshot,
          );

        await target.importScope(
          restoreTransplantSnapshot(
            bundle,
          ),
        );

        expect(
          await target.load(
            scope,
          ),
        ).toEqual(
          await source.load(
            scope,
          ),
        );

        expect(
          await target
            .recentMessages(
              scope,
            ),
        ).toEqual(
          await source
            .recentMessages(
              scope,
            ),
        );
      },
    );

    it(
      "refuses to overwrite a non-empty target scope",
      async () => {
        const dir =
          await mkdtemp(
            join(
              tmpdir(),
              "arbor-target-",
            ),
          );

        const store =
          new JsonFileArborStateStore(
            join(
              dir,
              "state.json",
            ),
          );

        const scope =
          "conversation:safe";

        await store.save(
          scope,
          baseState(),
        );

        await expect(
          store.importScope({
            scope,
            state:
              baseState(),
            turns:
              [],
          }),
        ).rejects.toThrow(
          "transplant_target_not_empty",
        );
      },
    );
  },
);

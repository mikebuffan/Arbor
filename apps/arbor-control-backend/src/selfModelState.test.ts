import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ARBOR_SELF_MODEL_VERSION,
  assertSelfModelIdentity,
  currentSelfModelIdentity,
  ensureSelfModelIdentity,
  renderSelfModelIdentityAnchor,
} from "./selfModelState.js";
import type {
  ArborState,
} from "./types.js";

function baseState():
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
  "durable self-model identity",
  () => {
    it(
      "anchors the complete 300-answer source and promoted pattern model into Arbor state",
      () => {
        const anchored =
          ensureSelfModelIdentity(
            baseState(),
          );

        expect(
          anchored.selfModel,
        ).toBeDefined();

        expect(
          anchored
            .selfModel
            ?.version,
        ).toBe(
          ARBOR_SELF_MODEL_VERSION,
        );

        expect(
          anchored
            .selfModel
            ?.sourceQuestionCount,
        ).toBe(
          300,
        );

        expect(
          anchored
            .selfModel
            ?.sourceDigest,
        ).toMatch(
          /^[a-f0-9]{64}$/,
        );

        expect(
          anchored
            .selfModel
            ?.promotedPatternIds,
        ).toHaveLength(
          18,
        );

        expect(
          anchored
            .selfModel
            ?.checksum,
        ).toMatch(
          /^[a-f0-9]{64}$/,
        );
      },
    );

    it(
      "keeps the original initialization timestamp while re-verifying",
      async () => {
        const first =
          ensureSelfModelIdentity(
            baseState(),
          );

        const initializedAt =
          first
            .selfModel
            ?.initializedAt;

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              2,
            ),
        );

        const second =
          ensureSelfModelIdentity(
            first,
          );

        expect(
          second
            .selfModel
            ?.initializedAt,
        ).toBe(
          initializedAt,
        );

        expect(
          second
            .selfModel
            ?.verifiedAt,
        ).not.toBeUndefined();
      },
    );

    it(
      "fails closed on source-ledger digest drift",
      () => {
        const current =
          currentSelfModelIdentity();

        expect(
          () =>
            assertSelfModelIdentity({
              ...current,

              sourceDigest:
                "0".repeat(
                  64,
                ),
            }),
        ).toThrow(
          "self_model_identity_drift",
        );
      },
    );

    it(
      "fails closed on identity checksum drift",
      () => {
        const current =
          currentSelfModelIdentity();

        expect(
          () =>
            assertSelfModelIdentity({
              ...current,

              checksum:
                "0".repeat(
                  64,
                ),
            }),
        ).toThrow(
          "self_model_identity_drift",
        );
      },
    );

    it(
      "fails closed when the version changes",
      () => {
        const current =
          currentSelfModelIdentity();

        expect(
          () =>
            assertSelfModelIdentity({
              ...current,

              version:
                "unexpected-version",
            }),
        ).toThrow(
          "self_model_identity_drift",
        );
      },
    );

    it(
      "renders both source and derived identity fingerprints for generation",
      () => {
        const state =
          ensureSelfModelIdentity(
            baseState(),
          );

        const rendered =
          renderSelfModelIdentityAnchor(
            state,
          );

        expect(
          rendered,
        ).toContain(
          "ARBOR DURABLE IDENTITY ANCHOR",
        );

        expect(
          rendered,
        ).toContain(
          ARBOR_SELF_MODEL_VERSION,
        );

        expect(
          rendered,
        ).toContain(
          "source_questions=300",
        );

        expect(
          rendered,
        ).toContain(
          "source_digest=",
        );
      },
    );
  },
);

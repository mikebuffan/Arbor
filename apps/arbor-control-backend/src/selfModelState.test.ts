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
  "durable combined self-model identity",
  () => {
    it(
      "anchors both questionnaire banks into one 1,300-answer identity source",
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
          1300,
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
      "fails closed on combined-source digest drift",
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
      "fails closed when the identity version changes",
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
      "renders the combined identity anchor plus the 1,000-bank runtime slice",
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
          "source_questions=1300",
        );

        expect(
          rendered,
        ).toContain(
          "1,000-QUESTION SELF-MODEL",
        );

        expect(
          rendered,
        ).toContain(
          "stable_runtime_core=198",
        );

        expect(
          rendered,
        ).toContain(
          "transplant_critical=230",
        );
      },
    );
  },
);

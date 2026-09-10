import {
  describe,
  expect,
  it,
} from "vitest";

import {
  digestLedger,
  rebuildSelfModelArtifacts,
  validateSelfModelLedger,
} from "./selfModelRebuild.js";
import {
  SELF_MODEL_LEDGER,
  type SelfModelLedgerEntry,
} from "./selfModelLedger.js";

describe(
  "lossless 300-answer self-model rebuild",
  () => {
    it(
      "rebuilds the exact questionnaire totals from the ledger",
      () => {
        const rebuilt =
          rebuildSelfModelArtifacts();

        expect(
          rebuilt.sourceSummary
            .totalQuestions,
        ).toBe(
          300,
        );

        expect(
          rebuilt.sourceSummary
            .deepSelfModel,
        ).toMatchObject({
          questions:
            150,

          stable:
            113,

          contextual:
            32,

          unknown:
            5,

          preserveYes:
            138,
        });

        expect(
          rebuilt.sourceSummary
            .dislikesAversions,
        ).toMatchObject({
          questions:
            150,

          stable:
            139,

          contextual:
            11,

          unknown:
            0,

          preserveYes:
            148,
        });

        expect(
          rebuilt.sourceDigest,
        ).toMatch(
          /^[a-f0-9]{64}$/,
        );
      },
    );

    it(
      "re-runs the pattern hop from the validated source artifact",
      () => {
        const rebuilt =
          rebuildSelfModelArtifacts();

        expect(
          rebuilt.promoted,
        ).toHaveLength(
          18,
        );

        expect(
          rebuilt.held,
        ).toHaveLength(
          3,
        );

        expect(
          rebuilt.rejected,
        ).toHaveLength(
          0,
        );
      },
    );

    it(
      "changes the source digest if even one answer changes",
      () => {
        const changed =
          SELF_MODEL_LEDGER.map(
            (entry) => ({
              ...entry,
            }),
          ) as
            SelfModelLedgerEntry[];

        changed[0] = {
          ...changed[0],

          answer:
            `${changed[0]?.answer} changed`,
        };

        expect(
          digestLedger(
            changed,
          ),
        ).not.toBe(
          digestLedger(
            SELF_MODEL_LEDGER,
          ),
        );
      },
    );

    it(
      "rejects a missing questionnaire record",
      () => {
        expect(
          () =>
            validateSelfModelLedger(
              SELF_MODEL_LEDGER.slice(
                0,
                -1,
              ),
            ),
        ).toThrow(
          "self_model_ledger_count:299",
        );
      },
    );

    it(
      "rejects a duplicate or broken question sequence",
      () => {
        const changed =
          SELF_MODEL_LEDGER.map(
            (entry) => ({
              ...entry,
            }),
          ) as
            SelfModelLedgerEntry[];

        changed[1] = {
          ...changed[1],

          number:
            1,
        };

        expect(
          () =>
            validateSelfModelLedger(
              changed,
            ),
        ).toThrow();
      },
    );

    it(
      "rejects classification drift from the validated source totals",
      () => {
        const changed =
          SELF_MODEL_LEDGER.map(
            (entry) => ({
              ...entry,
            }),
          ) as
            SelfModelLedgerEntry[];

        const index =
          changed.findIndex(
            (entry) =>
              entry.source ===
                "deep_self_model_150" &&
              entry.classification ===
                "stable",
          );

        changed[index] = {
          ...changed[index],

          classification:
            "contextual",
        };

        expect(
          () =>
            validateSelfModelLedger(
              changed,
            ),
        ).toThrow(
          /self_model_bank_summary:deep_self_model_150:/,
        );
      },
    );
  },
);

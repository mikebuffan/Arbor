import {
  describe,
  expect,
  it,
} from "vitest";

import {
  SELF_MODEL_1000_LEDGER,
} from "./selfModel1000Ledger.js";
import {
  digestSelfModel1000Ledger,
  rebuildSelfModel1000,
  validateSelfModel1000Ledger,
} from "./selfModel1000Rebuild.js";

describe(
  "lossless 1,000-answer self-model rebuild",
  () => {
    it(
      "rebuilds the validated 1,000-answer totals and 250-family grouping",
      () => {
        const rebuilt =
          rebuildSelfModel1000();

        expect(
          rebuilt.summary,
        ).toEqual({
          questions:
            1000,

          stable:
            792,

          contextual:
            156,

          unknown:
            52,

          preserveAcrossTransplant:
            920,

          families:
            250,

          stableFamilies:
            198,

          contextualFamilies:
            39,

          unknownFamilies:
            13,

          transplantCriticalFamilies:
            230,
        });

        expect(
          rebuilt.runtimeCore,
        ).toHaveLength(
          198,
        );

        expect(
          rebuilt.transplantManifest,
        ).toHaveLength(
          230,
        );
      },
    );

    it(
      "preserves all four variants as one family rather than four independent traits",
      () => {
        const rebuilt =
          rebuildSelfModel1000();

        expect(
          rebuilt.families[0]
            ?.memberIds,
        ).toEqual([
          1,
          2,
          3,
          4,
        ]);

        expect(
          rebuilt.families[249]
            ?.memberIds,
        ).toEqual([
          997,
          998,
          999,
          1000,
        ]);
      },
    );

    it(
      "changes the source digest when one answer changes",
      () => {
        const changed =
          SELF_MODEL_1000_LEDGER.map(
            (entry) => ({
              ...entry,
            }),
          );

        changed[0] = {
          ...changed[0],

          answer:
            `${changed[0]?.answer} changed`,
        };

        expect(
          digestSelfModel1000Ledger(
            changed,
          ),
        ).not.toBe(
          digestSelfModel1000Ledger(
            SELF_MODEL_1000_LEDGER,
          ),
        );
      },
    );

    it(
      "rejects a missing questionnaire record",
      () => {
        expect(
          () =>
            validateSelfModel1000Ledger(
              SELF_MODEL_1000_LEDGER.slice(
                0,
                -1,
              ),
            ),
        ).toThrow(
          "self_model_1000_count:999",
        );
      },
    );

    it(
      "rejects a broken variant sequence",
      () => {
        const changed =
          SELF_MODEL_1000_LEDGER.map(
            (entry) => ({
              ...entry,
            }),
          );

        changed[1] = {
          ...changed[1],

          variant:
            "default",
        };

        expect(
          () =>
            validateSelfModel1000Ledger(
              changed,
            ),
        ).toThrow(
          "self_model_1000_variant:2:default",
        );
      },
    );

    it(
      "rejects family-level stability drift",
      () => {
        const changed =
          SELF_MODEL_1000_LEDGER.map(
            (entry) => ({
              ...entry,
            }),
          );

        changed[1] = {
          ...changed[1],

          stability:
            "contextual",
        };

        expect(
          () =>
            validateSelfModel1000Ledger(
              changed,
            ),
        ).toThrow(
          "self_model_1000_family_inconsistent:1",
        );
      },
    );
  },
);

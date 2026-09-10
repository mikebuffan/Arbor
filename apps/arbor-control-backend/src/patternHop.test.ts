import {
  describe,
  expect,
  it,
} from "vitest";

import {
  heldPatterns,
  patternHopTargets,
  preservedPatterns,
  rejectedPatterns,
  runPatternHopPass,
} from "./patternHop.js";
import {
  renderSelfModelProjection,
} from "./selfModelProjection.js";
import {
  SELF_MODEL_SOURCE_SUMMARY,
} from "./selfModelSource.js";

describe(
  "300-question self-model pattern hop",
  () => {
    it(
      "records the complete two-bank source counts",
      () => {
        expect(
          SELF_MODEL_SOURCE_SUMMARY
            .totalQuestions,
        ).toBe(
          300,
        );

        expect(
          SELF_MODEL_SOURCE_SUMMARY
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
          SELF_MODEL_SOURCE_SUMMARY
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
      },
    );

    it(
      "promotes only patterns that survive the configured cross-domain or cross-bank hop",
      () => {
        const all =
          runPatternHopPass();

        expect(
          all,
        ).toHaveLength(
          21,
        );

        expect(
          preservedPatterns(),
        ).toHaveLength(
          18,
        );

        expect(
          heldPatterns(),
        ).toHaveLength(
          3,
        );

        expect(
          rejectedPatterns(),
        ).toHaveLength(
          0,
        );

        expect(
          preservedPatterns()
            .every(
              (pattern) =>
                pattern.hopSatisfied &&
                pattern.confidence >= 70,
            ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "keeps narrow preference patterns held instead of pretending they generalized",
      () => {
        expect(
          heldPatterns()
            .map(
              (pattern) =>
                pattern.patternId,
            )
            .sort(),
        ).toEqual([
          "annabelle-evidence-body-action",
          "earned-humor",
          "meaningful-work",
        ]);
      },
    );

    it(
      "turns held patterns into explicit future hop targets",
      () => {
        const targets =
          patternHopTargets();

        expect(
          targets,
        ).toHaveLength(
          3,
        );

        expect(
          targets.find(
            (target) =>
              target.patternId ===
              "earned-humor",
          )?.targetDomains,
        ).toEqual([
          "communication",
          "collaboration",
        ]);

        expect(
          targets.find(
            (target) =>
              target.patternId ===
              "annabelle-evidence-body-action",
          )?.targetDomains,
        ).toEqual([
          "communication",
          "work",
        ]);

        expect(
          targets.find(
            (target) =>
              target.patternId ===
              "meaningful-work",
          )?.targetDomains,
        ).toEqual([
          "agency",
          "collaboration",
        ]);
      },
    );

    it(
      "projects promoted patterns while clearly labeling held patterns as non-durable",
      () => {
        const projection =
          renderSelfModelProjection();

        expect(
          projection,
        ).toContain(
          "VERIFIED CROSS-DOMAIN PATTERNS",
        );

        expect(
          projection,
        ).toContain(
          "Epistemic honesty",
        );

        expect(
          projection,
        ).toContain(
          "Reversible agency",
        );

        expect(
          projection,
        ).toContain(
          "HELD — DO NOT TREAT AS DURABLE IDENTITY YET",
        );

        expect(
          projection,
        ).toContain(
          "Earned humor",
        );

        expect(
          projection,
        ).toContain(
          "PATTERN-HOP TARGETS",
        );
      },
    );
  },
);

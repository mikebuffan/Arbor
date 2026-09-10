import {
  createHash,
} from "node:crypto";

import {
  runPatternHopPass,
  type PatternHopResult,
} from "./patternHop.js";
import {
  SELF_MODEL_LEDGER,
  type SelfModelLedgerEntry,
} from "./selfModelLedger.js";
import {
  rebuildSelfModelSourceSummary,
  type SelfModelSourceSummary,
} from "./selfModelSource.js";

export type SelfModelRebuild = {
  sourceSummary:
    SelfModelSourceSummary;

  sourceDigest:
    string;

  promoted:
    PatternHopResult[];

  held:
    PatternHopResult[];

  rejected:
    PatternHopResult[];
};

export function rebuildSelfModelArtifacts(
  ledger:
    readonly SelfModelLedgerEntry[] =
    SELF_MODEL_LEDGER,
):
  SelfModelRebuild {
  validateSelfModelLedger(
    ledger,
  );

  const sourceSummary =
    rebuildSelfModelSourceSummary(
      ledger,
    );

  const patternPass =
    runPatternHopPass();

  return {
    sourceSummary,

    sourceDigest:
      digestLedger(
        ledger,
      ),

    promoted:
      patternPass.filter(
        (pattern) =>
          pattern.status ===
          "preserve",
      ),

    held:
      patternPass.filter(
        (pattern) =>
          pattern.status ===
          "hold",
      ),

    rejected:
      patternPass.filter(
        (pattern) =>
          pattern.status ===
          "reject",
      ),
  };
}

export function validateSelfModelLedger(
  ledger:
    readonly SelfModelLedgerEntry[],
): void {
  if (
    ledger.length !==
    300
  ) {
    throw new Error(
      `self_model_ledger_count:${ledger.length}`,
    );
  }

  validateBank(
    ledger,
    "deep_self_model_150",
    {
      stable:
        113,

      contextual:
        32,

      unknown:
        5,

      preserveYes:
        138,
    },
  );

  validateBank(
    ledger,
    "dislikes_aversions_150",
    {
      stable:
        139,

      contextual:
        11,

      unknown:
        0,

      preserveYes:
        148,
    },
  );

  const keys =
    new Set<string>();

  for (
    const entry of
    ledger
  ) {
    const key =
      `${entry.source}:${entry.number}`;

    if (
      keys.has(
        key,
      )
    ) {
      throw new Error(
        `self_model_ledger_duplicate:${key}`,
      );
    }

    keys.add(
      key,
    );

    if (
      !entry.section.trim() ||
      !entry.question.trim() ||
      !entry.answer.trim()
    ) {
      throw new Error(
        `self_model_ledger_empty_field:${key}`,
      );
    }
  }
}

export function digestLedger(
  ledger:
    readonly SelfModelLedgerEntry[],
): string {
  return createHash(
    "sha256",
  )
    .update(
      JSON.stringify(
        [...ledger]
          .map(
            (entry) => ({
              source:
                entry.source,

              number:
                entry.number,

              section:
                entry.section,

              question:
                entry.question,

              answer:
                entry.answer,

              classification:
                entry.classification,

              preserve:
                entry.preserve,
            }),
          )
          .sort(
            (
              left,
              right,
            ) =>
              left.source.localeCompare(
                right.source,
              ) ||
              left.number -
                right.number,
          ),
      ),
    )
    .digest(
      "hex",
    );
}

function validateBank(
  ledger:
    readonly SelfModelLedgerEntry[],

  source:
    SelfModelLedgerEntry["source"],

  expected: {
    stable:
      number;

    contextual:
      number;

    unknown:
      number;

    preserveYes:
      number;
  },
): void {
  const rows =
    ledger
      .filter(
        (entry) =>
          entry.source ===
          source,
      )
      .sort(
        (
          left,
          right,
        ) =>
          left.number -
          right.number,
      );

  if (
    rows.length !==
    150
  ) {
    throw new Error(
      `self_model_bank_count:${source}:${rows.length}`,
    );
  }

  for (
    let index = 0;
    index < 150;
    index += 1
  ) {
    if (
      rows[index]
        ?.number !==
      index + 1
    ) {
      throw new Error(
        `self_model_bank_sequence:${source}:${index + 1}`,
      );
    }
  }

  const actual = {
    stable:
      rows.filter(
        (entry) =>
          entry.classification ===
          "stable",
      ).length,

    contextual:
      rows.filter(
        (entry) =>
          entry.classification ===
          "contextual",
      ).length,

    unknown:
      rows.filter(
        (entry) =>
          entry.classification ===
          "unknown",
      ).length,

    preserveYes:
      rows.filter(
        (entry) =>
          entry.preserve,
      ).length,
  };

  for (
    const key of
    Object.keys(
      expected,
    ) as
      Array<
        keyof typeof expected
      >
  ) {
    if (
      actual[key] !==
      expected[key]
    ) {
      throw new Error(
        `self_model_bank_summary:${source}:${key}:${actual[key]}`,
      );
    }
  }
}

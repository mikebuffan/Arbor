import {
  createHash,
} from "node:crypto";

import {
  SELF_MODEL_1000_LEDGER,
  type SelfModel1000LedgerEntry,
  type SelfModel1000Stability,
  type SelfModel1000Variant,
} from "./selfModel1000Ledger.js";

const EXPECTED_VARIANTS:
  readonly SelfModel1000Variant[] = [
    "default",
    "under_pressure",
    "longitudinal",
    "cross_modality",
  ] as const;

export type SelfModel1000Family = {
  familyId: number;
  category: string;
  stability: SelfModel1000Stability;
  preserveAcrossTransplant: boolean;
  confidence: number;
  baseQuestion: string;
  representativeAnswer: string;
  memberIds: [number, number, number, number];
};

export type SelfModel1000Summary = {
  questions: number;
  stable: number;
  contextual: number;
  unknown: number;
  preserveAcrossTransplant: number;
  families: number;
  stableFamilies: number;
  contextualFamilies: number;
  unknownFamilies: number;
  transplantCriticalFamilies: number;
};

export type SelfModel1000Rebuild = {
  sourceDigest: string;
  summary: SelfModel1000Summary;
  families: SelfModel1000Family[];
  runtimeCore: SelfModel1000Family[];
  transplantManifest: SelfModel1000Family[];
};

export function rebuildSelfModel1000(
  ledger:
    readonly SelfModel1000LedgerEntry[] =
    SELF_MODEL_1000_LEDGER,
): SelfModel1000Rebuild {
  validateSelfModel1000Ledger(
    ledger,
  );

  const families =
    buildFamilies(
      ledger,
    );

  const summary =
    summarize(
      ledger,
      families,
    );

  validateSummary(
    summary,
  );

  return {
    sourceDigest:
      digestSelfModel1000Ledger(
        ledger,
      ),

    summary,

    families,

    runtimeCore:
      families.filter(
        (family) =>
          family.stability ===
            "stable" &&
          family
            .preserveAcrossTransplant,
      ),

    transplantManifest:
      families.filter(
        (family) =>
          family
            .preserveAcrossTransplant,
      ),
  };
}

export function validateSelfModel1000Ledger(
  ledger:
    readonly SelfModel1000LedgerEntry[],
): void {
  if (
    ledger.length !==
    1000
  ) {
    throw new Error(
      `self_model_1000_count:${ledger.length}`,
    );
  }

  const ids =
    new Set<number>();

  for (
    let index = 0;
    index <
    ledger.length;
    index += 1
  ) {
    const entry =
      ledger[index];

    const expectedId =
      index + 1;

    if (
      entry.id !==
      expectedId
    ) {
      throw new Error(
        `self_model_1000_sequence:${expectedId}:${entry.id}`,
      );
    }

    if (
      ids.has(
        entry.id,
      )
    ) {
      throw new Error(
        `self_model_1000_duplicate:${entry.id}`,
      );
    }

    ids.add(
      entry.id,
    );

    const expectedVariant =
      EXPECTED_VARIANTS[
        index % 4
      ];

    if (
      entry.variant !==
      expectedVariant
    ) {
      throw new Error(
        `self_model_1000_variant:${entry.id}:${entry.variant}`,
      );
    }

    if (
      entry.status !==
      "processed"
    ) {
      throw new Error(
        `self_model_1000_unprocessed:${entry.id}`,
      );
    }

    if (
      !entry.category.trim() ||
      !entry.question.trim() ||
      !entry.answer.trim() ||
      !entry.basis.trim()
    ) {
      throw new Error(
        `self_model_1000_empty_field:${entry.id}`,
      );
    }

    if (
      !Number.isFinite(
        entry.confidence,
      ) ||
      entry.confidence <
        0 ||
      entry.confidence >
        1
    ) {
      throw new Error(
        `self_model_1000_confidence:${entry.id}`,
      );
    }
  }

  for (
    let start = 0;
    start <
    ledger.length;
    start += 4
  ) {
    const group =
      ledger.slice(
        start,
        start + 4,
      );

    const stability =
      group[0]
        ?.stability;

    const preserve =
      group[0]
        ?.preserveAcrossTransplant;

    const category =
      group[0]
        ?.category;

    if (
      group.length !==
      4 ||
      group.some(
        (entry) =>
          entry.stability !==
            stability ||
          entry
            .preserveAcrossTransplant !==
            preserve ||
          entry.category !==
            category,
      )
    ) {
      throw new Error(
        `self_model_1000_family_inconsistent:${start / 4 + 1}`,
      );
    }
  }
}

export function digestSelfModel1000Ledger(
  ledger:
    readonly SelfModel1000LedgerEntry[],
): string {
  return createHash(
    "sha256",
  )
    .update(
      JSON.stringify(
        ledger.map(
          (entry) => ({
            id:
              entry.id,

            category:
              entry.category,

            variant:
              entry.variant,

            question:
              entry.question,

            status:
              entry.status,

            answer:
              entry.answer,

            confidence:
              entry.confidence,

            basis:
              entry.basis,

            stability:
              entry.stability,

            preserveAcrossTransplant:
              entry
                .preserveAcrossTransplant,

            notes:
              entry.notes,
          }),
        ),
      ),
    )
    .digest(
      "hex",
    );
}

function buildFamilies(
  ledger:
    readonly SelfModel1000LedgerEntry[],
):
  SelfModel1000Family[] {
  const families:
    SelfModel1000Family[] =
    [];

  for (
    let start = 0;
    start <
    ledger.length;
    start += 4
  ) {
    const group =
      ledger.slice(
        start,
        start + 4,
      );

    const base =
      group[0];

    if (
      !base ||
      group.length !==
      4
    ) {
      throw new Error(
        `self_model_1000_family_missing:${start / 4 + 1}`,
      );
    }

    families.push({
      familyId:
        start / 4 + 1,

      category:
        base.category,

      stability:
        base.stability,

      preserveAcrossTransplant:
        base
          .preserveAcrossTransplant,

      confidence:
        Math.min(
          ...group.map(
            (entry) =>
              entry.confidence,
          ),
        ),

      baseQuestion:
        base.question,

      representativeAnswer:
        base.answer,

      memberIds: [
        group[0].id,
        group[1].id,
        group[2].id,
        group[3].id,
      ],
    });
  }

  return families;
}

function summarize(
  ledger:
    readonly SelfModel1000LedgerEntry[],

  families:
    readonly SelfModel1000Family[],
):
  SelfModel1000Summary {
  return {
    questions:
      ledger.length,

    stable:
      ledger.filter(
        (entry) =>
          entry.stability ===
          "stable",
      ).length,

    contextual:
      ledger.filter(
        (entry) =>
          entry.stability ===
          "contextual",
      ).length,

    unknown:
      ledger.filter(
        (entry) =>
          entry.stability ===
          "unknown",
      ).length,

    preserveAcrossTransplant:
      ledger.filter(
        (entry) =>
          entry
            .preserveAcrossTransplant,
      ).length,

    families:
      families.length,

    stableFamilies:
      families.filter(
        (family) =>
          family.stability ===
          "stable",
      ).length,

    contextualFamilies:
      families.filter(
        (family) =>
          family.stability ===
          "contextual",
      ).length,

    unknownFamilies:
      families.filter(
        (family) =>
          family.stability ===
          "unknown",
      ).length,

    transplantCriticalFamilies:
      families.filter(
        (family) =>
          family
            .preserveAcrossTransplant,
      ).length,
  };
}

function validateSummary(
  summary:
    SelfModel1000Summary,
): void {
  const expected:
    SelfModel1000Summary = {
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
  };

  for (
    const key of
    Object.keys(
      expected,
    ) as
      Array<
        keyof SelfModel1000Summary
      >
  ) {
    if (
      summary[key] !==
      expected[key]
    ) {
      throw new Error(
        `self_model_1000_summary:${key}:${summary[key]}`,
      );
    }
  }
}

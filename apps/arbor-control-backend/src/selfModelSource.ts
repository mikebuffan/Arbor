import {
  SELF_MODEL_LEDGER,
  type SelfModelLedgerEntry,
} from "./selfModelLedger.js";

export type SelfModelBankSummary = {
  sourceId:
    SelfModelLedgerEntry["source"];

  questions:
    number;

  stable:
    number;

  contextual:
    number;

  unknown:
    number;

  preserveYes:
    number;
};

export type SelfModelSourceSummary = {
  deepSelfModel:
    SelfModelBankSummary;

  dislikesAversions:
    SelfModelBankSummary;

  totalQuestions:
    number;

  rule:
    string;
};

export function rebuildSelfModelSourceSummary(
  ledger:
    readonly SelfModelLedgerEntry[],
):
  SelfModelSourceSummary {
  const deepSelfModel =
    summarizeBank(
      ledger,
      "deep_self_model_150",
    );

  const dislikesAversions =
    summarizeBank(
      ledger,
      "dislikes_aversions_150",
    );

  return {
    deepSelfModel,

    dislikesAversions,

    totalQuestions:
      ledger.length,

    rule:
      "Stable items may seed longitudinal self-model weights. Contextual items require cross-context evidence. Unknown items remain open. Contradictions retain provenance rather than being silently reconciled.",
  };
}

export const SELF_MODEL_SOURCE_SUMMARY =
  rebuildSelfModelSourceSummary(
    SELF_MODEL_LEDGER,
  );

function summarizeBank(
  ledger:
    readonly SelfModelLedgerEntry[],

  sourceId:
    SelfModelLedgerEntry["source"],
):
  SelfModelBankSummary {
  const rows =
    ledger.filter(
      (entry) =>
        entry.source ===
        sourceId,
    );

  return {
    sourceId,

    questions:
      rows.length,

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
}

import {
  DEEP_SELF_MODEL_ROWS,
} from "./selfModelLedger.deep.js";
import {
  DISLIKES_AVERSIONS_ROWS,
} from "./selfModelLedger.dislikes.js";
import type {
  RawSelfModelLedgerRow,
  SelfModelLedgerEntry,
  SelfModelSourceId,
} from "./selfModelLedgerTypes.js";

export type {
  SelfModelClassification,
  SelfModelLedgerEntry,
  SelfModelSourceId,
} from "./selfModelLedgerTypes.js";

export const SELF_MODEL_LEDGER:
  readonly SelfModelLedgerEntry[] = [
    ...expand(
      "deep_self_model_150",
      DEEP_SELF_MODEL_ROWS,
    ),

    ...expand(
      "dislikes_aversions_150",
      DISLIKES_AVERSIONS_ROWS,
    ),
  ] as const;

function expand(
  source:
    SelfModelSourceId,

  rows:
    readonly RawSelfModelLedgerRow[],
):
  SelfModelLedgerEntry[] {
  return rows.map(
    (
      [
        number,
        section,
        question,
        answer,
        classification,
        preserve,
      ],
    ) => ({
      source,
      number,
      section,
      question,
      answer,
      classification,
      preserve,
    }),
  );
}

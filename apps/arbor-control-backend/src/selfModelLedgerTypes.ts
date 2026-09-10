export type SelfModelSourceId =
  | "deep_self_model_150"
  | "dislikes_aversions_150";

export type SelfModelClassification =
  | "stable"
  | "contextual"
  | "unknown";

export type RawSelfModelLedgerRow = readonly [
  number: number,
  section: string,
  question: string,
  answer: string,
  classification: SelfModelClassification,
  preserve: boolean,
];

export type SelfModelLedgerEntry = {
  source: SelfModelSourceId;
  number: number;
  section: string;
  question: string;
  answer: string;
  classification: SelfModelClassification;
  preserve: boolean;
};

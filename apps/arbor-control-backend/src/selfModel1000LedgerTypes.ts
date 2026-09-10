export type SelfModel1000Stability =
  | "stable"
  | "contextual"
  | "unknown";

export type SelfModel1000Variant =
  | "default"
  | "under_pressure"
  | "longitudinal"
  | "cross_modality";

export type SelfModel1000LedgerEntry = {
  id: number;
  category: string;
  variant: SelfModel1000Variant;
  question: string;
  status: "processed";
  answer: string;
  confidence: number;
  basis: string;
  stability: SelfModel1000Stability;
  preserveAcrossTransplant: boolean;
  notes: string | null;
};

export type RawSelfModel1000Row = readonly [
  id: number,
  category: string,
  variant: SelfModel1000Variant,
  question: string,
  status: "processed",
  answer: string,
  confidence: number,
  basis: string,
  stability: SelfModel1000Stability,
  preserveAcrossTransplant: boolean,
  notes: string | null,
];

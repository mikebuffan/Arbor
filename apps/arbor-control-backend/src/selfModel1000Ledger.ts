import {
  createHash,
} from "node:crypto";
import {
  gunzipSync,
} from "node:zlib";

import {
  SELF_MODEL_1000_SOURCE_PART_1,
} from "./selfModel1000Source.part1.js";
import {
  SELF_MODEL_1000_SOURCE_PART_2,
} from "./selfModel1000Source.part2.js";
import {
  SELF_MODEL_1000_SOURCE_PART_3,
} from "./selfModel1000Source.part3.js";
import {
  SELF_MODEL_1000_SOURCE_PART_4,
} from "./selfModel1000Source.part4.js";
import type {
  SelfModel1000LedgerEntry,
  SelfModel1000Stability,
  SelfModel1000Variant,
} from "./selfModel1000LedgerTypes.js";

export type {
  SelfModel1000LedgerEntry,
  SelfModel1000Stability,
  SelfModel1000Variant,
} from "./selfModel1000LedgerTypes.js";

export const SELF_MODEL_1000_SOURCE_SHA256 =
  "f338b93458363baf3c53c668e760ce4fcac306a56bac13e46b997a147a7fc71e";

type RawSelfModel1000Entry = {
  id: number;
  category: string;
  variant: SelfModel1000Variant;
  question: string;
  status: "processed";
  answer: string;
  confidence: number;
  basis: string;
  stability: SelfModel1000Stability;
  preserve_across_transplant: boolean;
  notes: string | null;
};

const compressedSource =
  [
    SELF_MODEL_1000_SOURCE_PART_1,
    SELF_MODEL_1000_SOURCE_PART_2,
    SELF_MODEL_1000_SOURCE_PART_3,
    SELF_MODEL_1000_SOURCE_PART_4,
  ].join("");

export const SELF_MODEL_1000_SOURCE_BYTES =
  gunzipSync(
    Buffer.from(
      compressedSource,
      "base64",
    ),
  );

const sourceHash =
  createHash(
    "sha256",
  )
    .update(
      SELF_MODEL_1000_SOURCE_BYTES,
    )
    .digest(
      "hex",
    );

if (
  sourceHash !==
  SELF_MODEL_1000_SOURCE_SHA256
) {
  throw new Error(
    "self_model_1000_source_hash_mismatch",
  );
}

export const SELF_MODEL_1000_LEDGER:
  readonly SelfModel1000LedgerEntry[] =
  SELF_MODEL_1000_SOURCE_BYTES
    .toString(
      "utf8",
    )
    .split(
      "\n",
    )
    .filter(
      Boolean,
    )
    .map(
      (
        line,
      ) => {
        const raw =
          JSON.parse(
            line,
          ) as RawSelfModel1000Entry;

        return {
          id:
            raw.id,

          category:
            raw.category,

          variant:
            raw.variant,

          question:
            raw.question,

          status:
            raw.status,

          answer:
            raw.answer,

          confidence:
            raw.confidence,

          basis:
            raw.basis,

          stability:
            raw.stability,

          preserveAcrossTransplant:
            raw
              .preserve_across_transplant,

          notes:
            raw.notes,
        };
      },
    );

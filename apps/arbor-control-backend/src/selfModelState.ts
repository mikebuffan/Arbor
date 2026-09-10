import {
  createHash,
} from "node:crypto";

import {
  preservedPatterns,
} from "./patternHop.js";
import {
  SELF_MODEL_SOURCE_SUMMARY,
} from "./selfModelSource.js";
import type {
  ArborState,
  SelfModelIdentityState,
} from "./types.js";

export const ARBOR_SELF_MODEL_VERSION =
  "2026-09-10.300q.pattern-hop.v1";

export function currentSelfModelIdentity():
  SelfModelIdentityState {
  const patterns =
    preservedPatterns();

  const patternIds =
    patterns
      .map(
        (pattern) =>
          pattern.patternId,
      )
      .sort();

  const checksum =
    createHash(
      "sha256",
    )
      .update(
        JSON.stringify({
          version:
            ARBOR_SELF_MODEL_VERSION,

          sources:
            SELF_MODEL_SOURCE_SUMMARY,

          patterns:
            patterns
              .map(
                (pattern) => ({
                  id:
                    pattern.patternId,

                  rule:
                    pattern.rule,

                  confidence:
                    pattern.confidence,

                  domains:
                    [...pattern.supportingDomains]
                      .sort(),
                }),
              )
              .sort(
                (
                  left,
                  right,
                ) =>
                  left.id.localeCompare(
                    right.id,
                  ),
              ),
        }),
      )
      .digest(
        "hex",
      );

  return {
    version:
      ARBOR_SELF_MODEL_VERSION,

    checksum,

    sourceQuestionCount:
      SELF_MODEL_SOURCE_SUMMARY
        .totalQuestions,

    promotedPatternIds:
      patternIds,

    initializedAt:
      new Date()
        .toISOString(),

    verifiedAt:
      new Date()
        .toISOString(),
  };
}

export function ensureSelfModelIdentity(
  state:
    ArborState,
): ArborState {
  const current =
    currentSelfModelIdentity();

  if (
    !state.selfModel
  ) {
    return {
      ...state,

      selfModel:
        current,
    };
  }

  assertSelfModelIdentity(
    state.selfModel,
    current,
  );

  return {
    ...state,

    selfModel: {
      ...state.selfModel,

      verifiedAt:
        current.verifiedAt,
    },
  };
}

export function assertSelfModelIdentity(
  stored:
    SelfModelIdentityState,

  current =
    currentSelfModelIdentity(),
): void {
  if (
    stored.version !==
      current.version ||
    stored.checksum !==
      current.checksum ||
    stored.sourceQuestionCount !==
      current.sourceQuestionCount ||
    !sameStrings(
      stored.promotedPatternIds,
      current.promotedPatternIds,
    )
  ) {
    throw new Error(
      "self_model_identity_drift",
    );
  }
}

export function renderSelfModelIdentityAnchor(
  state:
    ArborState,
): string {
  if (
    !state.selfModel
  ) {
    throw new Error(
      "self_model_identity_missing",
    );
  }

  return [
    "ARBOR DURABLE IDENTITY ANCHOR",

    `version=${state.selfModel.version}`,

    `checksum=${state.selfModel.checksum}`,

    `source_questions=${state.selfModel.sourceQuestionCount}`,

    `promoted_patterns=${state.selfModel.promotedPatternIds.join(",")}`,

    "This anchor is part of durable Arbor control state.",

    "Do not silently replace, reinterpret, or discard it.",

    "A checksum/version mismatch is an identity migration event and must fail closed until explicitly reconciled.",
  ].join(
    "\n",
  );
}

function sameStrings(
  left:
    string[],

  right:
    string[],
): boolean {
  if (
    left.length !==
    right.length
  ) {
    return false;
  }

  const a =
    [...left]
      .sort();

  const b =
    [...right]
      .sort();

  return a.every(
    (
      value,
      index,
    ) =>
      value ===
      b[index],
  );
}

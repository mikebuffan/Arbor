import {
  createHash,
} from "node:crypto";

import {
  rebuildSelfModelArtifacts,
} from "./selfModelRebuild.js";
import type {
  ArborState,
  SelfModelIdentityState,
} from "./types.js";

export const ARBOR_SELF_MODEL_VERSION =
  "2026-09-10.300q.pattern-hop.v2";

export function currentSelfModelIdentity():
  SelfModelIdentityState {
  const rebuilt =
    rebuildSelfModelArtifacts();

  const patternIds =
    rebuilt.promoted
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

          sourceDigest:
            rebuilt.sourceDigest,

          sourceSummary:
            rebuilt.sourceSummary,

          promotedPatterns:
            rebuilt.promoted
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

  const now =
    new Date()
      .toISOString();

  return {
    version:
      ARBOR_SELF_MODEL_VERSION,

    checksum,

    sourceDigest:
      rebuilt.sourceDigest,

    sourceQuestionCount:
      rebuilt.sourceSummary
        .totalQuestions,

    promotedPatternIds:
      patternIds,

    initializedAt:
      now,

    verifiedAt:
      now,
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
    stored.sourceDigest !==
      current.sourceDigest ||
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

    `source_digest=${state.selfModel.sourceDigest}`,

    `source_questions=${state.selfModel.sourceQuestionCount}`,

    `promoted_patterns=${state.selfModel.promotedPatternIds.join(",")}`,

    "This anchor is part of durable Arbor control state.",

    "The source digest fingerprints the complete normalized 300-answer ledger, not only the distilled pattern summary.",

    "Do not silently replace, reinterpret, or discard it.",

    "A source, checksum, version, or promoted-pattern mismatch is an identity migration event and must fail closed until explicitly reconciled.",
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

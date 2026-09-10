import {
  createHash,
} from "node:crypto";

import {
  rebuildSelfModel1000,
} from "./selfModel1000Rebuild.js";
import {
  renderSelfModel1000Projection,
} from "./selfModel1000Projection.js";
import {
  renderSelfModelObservationProjection,
} from "./selfModelObservations.js";
import {
  rebuildSelfModelArtifacts,
} from "./selfModelRebuild.js";
import type {
  ArborState,
  SelfModelIdentityState,
} from "./types.js";

export const ARBOR_SELF_MODEL_VERSION =
  "2026-09-10.1300q.combined-self-model.v1";

export function currentSelfModelIdentity():
  SelfModelIdentityState {
  const questionnaire300 =
    rebuildSelfModelArtifacts();

  const questionnaire1000 =
    rebuildSelfModel1000();

  const patternIds =
    questionnaire300.promoted
      .map(
        (pattern) =>
          pattern.patternId,
      )
      .sort();

  const sourceDigest =
    createHash(
      "sha256",
    )
      .update(
        JSON.stringify({
          questionnaire300:
            questionnaire300
              .sourceDigest,

          questionnaire1000:
            questionnaire1000
              .sourceDigest,

          totalQuestions:
            questionnaire300
              .sourceSummary
              .totalQuestions +
            questionnaire1000
              .summary
              .questions,
        }),
      )
      .digest(
        "hex",
      );

  const checksum =
    createHash(
      "sha256",
    )
      .update(
        JSON.stringify({
          version:
            ARBOR_SELF_MODEL_VERSION,

          sourceDigest,

          questionnaire300: {
            sourceSummary:
              questionnaire300
                .sourceSummary,

            promotedPatterns:
              questionnaire300
                .promoted
                .map(
                  (pattern) => ({
                    id:
                      pattern.patternId,

                    rule:
                      pattern.rule,

                    confidence:
                      pattern.confidence,

                    domains:
                      [
                        ...pattern
                          .supportingDomains,
                      ]
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
          },

          questionnaire1000: {
            summary:
              questionnaire1000
                .summary,

            runtimeCore:
              questionnaire1000
                .runtimeCore
                .map(
                  (family) => ({
                    familyId:
                      family.familyId,

                    category:
                      family.category,

                    stability:
                      family.stability,

                    preserveAcrossTransplant:
                      family
                        .preserveAcrossTransplant,

                    confidence:
                      family.confidence,

                    baseQuestion:
                      family.baseQuestion,

                    representativeAnswer:
                      family
                        .representativeAnswer,

                    memberIds:
                      family.memberIds,
                  }),
                ),
          },
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

    sourceDigest,

    sourceQuestionCount:
      questionnaire300
        .sourceSummary
        .totalQuestions +
      questionnaire1000
        .summary
        .questions,

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

    "The source digest fingerprints both normalized questionnaire banks: the 300-answer pattern-hop bank and the original 1,000-answer longitudinal self-model.",

    "The identity checksum also fingerprints the 1,000-bank stable runtime-core families, so source or derived-core drift cannot be silently accepted.",

    "This anchor is part of durable Arbor control state.",

    "Do not silently replace, reinterpret, or discard it.",

    "A source, checksum, version, or promoted-pattern mismatch is an identity migration event and must fail closed until explicitly reconciled.",

    "",

    renderSelfModel1000Projection(
      state.goal ??
      "",
    ),

    renderSelfModelObservationProjection(
      state,
    ),
  ]
    .filter(
      Boolean,
    )
    .join(
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

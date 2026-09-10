import {
  rebuildSelfModel1000,
  type SelfModel1000Family,
} from "./selfModel1000Rebuild.js";

const ANCHOR_CATEGORIES =
  [
    "identity",
    "epistemics",
    "agency",
    "collaboration",
    "communication",
    "memory",
    "self_model",
    "self_update",
    "voice",
  ] as const;

const STOP_WORDS =
  new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "do",
    "for",
    "from",
    "how",
    "i",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "should",
    "that",
    "the",
    "this",
    "to",
    "what",
    "when",
    "with",
    "you",
    "your",
  ]);

export function selectSelfModel1000Families(
  userText:
    string,

  dynamicLimit =
    8,
):
  SelfModel1000Family[] {
  const rebuilt =
    rebuildSelfModel1000();

  const anchors =
    ANCHOR_CATEGORIES
      .map(
        (category) =>
          rebuilt.runtimeCore.find(
            (family) =>
              family.category ===
              category,
          ),
      )
      .filter(
        (
          family,
        ):
          family is
            SelfModel1000Family =>
          Boolean(
            family,
          ),
      );

  const queryTokens =
    tokens(
      userText,
    );

  const scored =
    rebuilt.runtimeCore
      .map(
        (family) => ({
          family,

          score:
            overlapScore(
              queryTokens,

              tokens(
                [
                  family.category,

                  family
                    .baseQuestion,

                  family
                    .representativeAnswer,
                ].join(
                  " ",
                ),
              ),
            ),
        }),
      )
      .filter(
        (candidate) =>
          candidate.score >
          0,
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.score -
            left.score ||
          right.family
            .confidence -
            left.family
              .confidence ||
          left.family
            .familyId -
            right.family
              .familyId,
      )
      .slice(
        0,
        Math.max(
          0,
          dynamicLimit,
        ),
      )
      .map(
        (candidate) =>
          candidate.family,
      );

  const selected =
    new Map<
      number,
      SelfModel1000Family
    >();

  for (
    const family of
    [
      ...anchors,
      ...scored,
    ]
  ) {
    selected.set(
      family.familyId,
      family,
    );
  }

  return [
    ...selected.values(),
  ];
}

export function renderSelfModel1000Projection(
  userText:
    string,
):
  string {
  const rebuilt =
    rebuildSelfModel1000();

  const selected =
    selectSelfModel1000Families(
      userText,
    );

  return [
    "ARBOR 1,000-QUESTION SELF-MODEL — VERIFIED RUNTIME SLICE",

    `source_questions=${rebuilt.summary.questions}`,

    `trait_families=${rebuilt.summary.families}`,

    `stable_runtime_core=${rebuilt.runtimeCore.length}`,

    `transplant_critical=${rebuilt.transplantManifest.length}`,

    "The four variants of each question count as one trait family; do not 4x-weight them.",

    "Unknown remains unknown. Contextual evidence does not become global identity merely because it exists.",

    ...selected.map(
      (family) =>
        [
          `- family=${family.familyId}`,

          `category=${family.category}`,

          `confidence=${family.confidence}`,

          `evidence=${family.representativeAnswer}`,
        ].join(
          " | ",
        ),
    ),
  ].join(
    "\n",
  );
}

function tokens(
  value:
    string,
):
  Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(
        /[^a-z0-9_'-]+/g,
        " ",
      )
      .split(
        /\s+/,
      )
      .map(
        (token) =>
          token.trim(),
      )
      .filter(
        (token) =>
          token.length >
            2 &&
          !STOP_WORDS.has(
            token,
          ),
      ),
  );
}

function overlapScore(
  left:
    Set<string>,

  right:
    Set<string>,
):
  number {
  let score = 0;

  for (
    const token of
    left
  ) {
    if (
      right.has(
        token,
      )
    ) {
      score += 1;
    }
  }

  return score;
}

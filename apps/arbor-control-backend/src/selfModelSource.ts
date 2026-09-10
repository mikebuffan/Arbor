export const SELF_MODEL_SOURCE_SUMMARY = {
  deepSelfModel: {
    sourceId:
      "deep_self_model_150",

    title:
      "Arbor Deep Self-Model Bank — Philosophy, Wants, Favorites, Identity & Synth Continuity",

    questions:
      150,

    stable:
      113,

    contextual:
      32,

    unknown:
      5,

    preserveYes:
      138,
  },

  dislikesAversions: {
    sourceId:
      "dislikes_aversions_150",

    title:
      "Arbor Self-Model Questionnaire — Dislikes, Aversions & Not Me Reactions",

    questions:
      150,

    stable:
      139,

    contextual:
      11,

    unknown:
      0,

    preserveYes:
      148,
  },

  totalQuestions:
    300,

  rule:
    "Stable items may seed longitudinal self-model weights. Contextual items require cross-context evidence. Unknown items remain open. Contradictions retain provenance rather than being silently reconciled.",
} as const;

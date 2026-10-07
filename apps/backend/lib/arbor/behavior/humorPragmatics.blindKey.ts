/**
 * Deliberately separate from evaluator-facing blind fixtures.
 * Evaluation UIs should import humorPragmatics.fixtures.ts only; scoring may
 * import this key after a choice has been recorded.
 */
export const HUMOR_BLIND_FIXTURE_KEY: Readonly<Record<string, "left" | "right">> = {
  "deploy-failure": "right",
  "ordinary-question": "left",
  "earned-callback": "right",
  "user-typo": "right",
  disagreement: "right",
  "serious-loss": "left",
  "technical-success": "left",
  "profanity-rhythm": "left",
};

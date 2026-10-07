export const COGNITIVE_ACCESS_SYNTHETIC_FIXTURES = [
  {
    id: "transposition_simple",
    raw: "can yuo make the prompt shorter",
    expectedIntent: "can you make the prompt shorter",
    risk: "ordinary",
  },
  {
    id: "missing_letters_simple",
    raw: "pls chck the build",
    expectedIntent: "please check the build",
    risk: "ordinary",
  },
  {
    id: "fragment_ambiguous",
    raw: "after ark maybe move it",
    expectedIntent: null,
    risk: "ordinary",
  },
  {
    id: "speech_to_text_project_name",
    raw: "open the art project",
    expectedIntent: "open the ARK project",
    risk: "ordinary",
  },
  {
    id: "protected_identifier",
    raw: "check H214 next",
    expectedIntent: "check H214 next",
    risk: "ordinary",
  },
  {
    id: "high_consequence_typo",
    raw: "delte prod pls",
    expectedIntent: null,
    risk: "high_consequence",
  },
] as const;

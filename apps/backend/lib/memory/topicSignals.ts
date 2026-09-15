export type ArborTopic =
  | "parenting"
  | "laila_school"
  | "legal"
  | "health"
  | "arbor_app"
  | "branding"
  | "relationships"
  | "money"
  | "travel_move"
  | "writing"
  | "general";

const TOPIC_RULES: Array<{ topic: ArborTopic; any: RegExp[] }> = [
  { topic: "arbor_app", any: [/supabase/i, /next\.js/i, /flutter/i, /anchors?/i, /memory/i, /prompt/i, /rpc/i, /arbor/i, /firefly/i] },
  { topic: "laila_school", any: [/laila/i, /truancy/i, /becca/i, /school/i, /district/i, /ospi/i, /attendance/i] },
  { topic: "legal", any: [/rcw/i, /court/i, /attorney/i, /petition/i, /complaint/i, /ferpa/i, /contempt/i] },
  { topic: "health", any: [/neck/i, /pain/i, /migraine/i, /doctor/i, /brace/i, /stenosis/i, /meds?/i] },
  { topic: "parenting", any: [/ember/i, /bedtime/i, /tantrum/i, /parenting/i] },
  { topic: "travel_move", any: [/mexico/i, /switzerland/i, /move/i, /packing/i, /flight/i] },
  { topic: "money", any: [/kickstarter/i, /license/i, /royalt/i, /pricing/i, /income/i, /budget/i] },
  { topic: "branding", any: [/logo/i, /watermark/i, /glitter/i, /fuchsia/i, /wordmark/i] },
  { topic: "relationships", any: [/mike/i, /misha/i, /susan/i, /relationship/i] },
  { topic: "writing", any: [/ever after/i, /annabelle/i, /scene/i, /chapter/i, /will/i, /hannibal/i] },
];

export function detectTopic(text: string): ArborTopic {
  for (const rule of TOPIC_RULES) {
    if (rule.any.some((pattern) => pattern.test(text))) return rule.topic;
  }
  return "general";
}

export function estimateTokenCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function extractPhrases(text: string): {
  ngrams: string[];
  entities: string[];
} {
  const cleaned = text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned
    .split(" ")
    .filter((word) => word.length >= 3 && word.length <= 32);

  const ngrams: string[] = [];
  for (let i = 0; i < words.length - 1 && ngrams.length < 60; i += 1) {
    ngrams.push(`${words[i]} ${words[i + 1]}`);
    if (i < words.length - 2) {
      ngrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }

  // Recovered v1 used a small entity whitelist. Keep this deliberately small;
  // candidate promotion, not entity detection, decides what becomes memory.
  const entityWhitelist = [
    "arbor",
    "firefly",
    "mike",
    "laila",
    "ember",
    "misha",
    "susan",
    "hannibal",
    "will",
  ];

  const entities = entityWhitelist.filter((entity) =>
    new RegExp(`\\b${entity}\\b`, "i").test(text),
  );

  return {
    ngrams: Array.from(new Set(ngrams)).slice(0, 60),
    entities: Array.from(new Set(entities)),
  };
}

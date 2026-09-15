export type TestModeSignal =
  | "explicit_testing_language"
  | "structured_contradiction_test"
  | "rapid_preference_changes"
  | "artificial_example"
  | "behavior_probe"
  | "fake_placeholder_data";

export type TestModeResult = {
  isTestMode: boolean;
  confidence: number;
  signals: TestModeSignal[];
  reason: string | null;
  shouldPreventLongTermPromotion: boolean;
  explicitRealMemoryConfirmation: boolean;
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function countPreferenceStatements(text: string): number {
  const patterns = [
    /\bmy favorite\b/g,
    /\bi like\b/g,
    /\bi prefer\b/g,
    /\bi hate\b/g,
    /\bi don't like\b/g,
    /\bi do not like\b/g,
  ];

  return patterns.reduce(
    (count, pattern) => count + Array.from(text.matchAll(pattern)).length,
    0,
  );
}

function hasRapidPreferenceChange(text: string): boolean {
  const correctionLanguage = includesAny(text, [
    "actually",
    "never mind",
    "changed my mind",
    "more than",
    "instead",
  ]);

  const preferenceCount = countPreferenceStatements(text);
  return (
    preferenceCount >= 3 ||
    (preferenceCount >= 2 && correctionLanguage)
  );
}

function hasStructuredContradictionTest(text: string): boolean {
  const shortVsLong =
    includesAny(text, [
      "keep things short",
      "short answers",
      "concise answers",
      "brief answers",
      "i hate long explanations",
    ]) &&
    includesAny(text, [
      "deep detailed answers",
      "detailed answers",
      "long explanations",
      "full explanation",
      "go in depth",
    ]);

  const coldVsWarm =
    text.includes("cold weather") &&
    text.includes("warm weather");

  const preferenceCorrection =
    text.includes("favorite food") &&
    text.includes("more than") &&
    text.includes("actually");

  return shortVsLong || coldVsWarm || preferenceCorrection;
}

function hasExplicitRealMemoryConfirmation(text: string): boolean {
  return includesAny(text, [
    "this is real",
    "this one is real",
    "actually store this",
    "this is not a test",
    "not a test",
    "save this for real",
    "remember this for real",
    "this should be permanent",
    "this is a real preference",
  ]);
}

export function detectTestMode(userMessage: string): TestModeResult {
  const text = normalize(userMessage);
  const signals: TestModeSignal[] = [];
  const explicitRealMemoryConfirmation =
    hasExplicitRealMemoryConfirmation(text);

  if (
    includesAny(text, [
      "stress test",
      "stress-testing",
      "fake data",
      "placeholder",
      "pretend that",
      "hypothetical",
      "let's see if",
      "lets see if",
      "see what you do",
      "see if you catch",
    ])
  ) {
    signals.push("explicit_testing_language");
  }

  if (hasStructuredContradictionTest(text)) {
    signals.push("structured_contradiction_test");
  }

  if (hasRapidPreferenceChange(text)) {
    signals.push("rapid_preference_changes");
  }

  if (
    includesAny(text, [
      "for example",
      "example:",
      "sample:",
      "pretend that",
      "hypothetically",
      "imagine i said",
      "say i said",
    ])
  ) {
    signals.push("artificial_example");
  }

  if (
    includesAny(text, [
      "what would you do",
      "how would you handle",
      "would you catch",
      "can you detect",
      "does this trigger",
      "is there code for this",
    ])
  ) {
    signals.push("behavior_probe");
  }

  if (
    includesAny(text, [
      "ultraviolet fuchsia",
      "favorite test color",
      "fake preference",
      "dummy value",
      "lorem ipsum",
    ])
  ) {
    signals.push("fake_placeholder_data");
  }

  let confidence = 0;
  for (const signal of signals) {
    if (signal === "explicit_testing_language") confidence += 0.35;
    if (signal === "structured_contradiction_test") confidence += 0.35;
    if (signal === "rapid_preference_changes") confidence += 0.25;
    if (signal === "artificial_example") confidence += 0.30;
    if (signal === "behavior_probe") confidence += 0.25;
    if (signal === "fake_placeholder_data") confidence += 0.25;
  }

  confidence = Math.min(1, Number(confidence.toFixed(2)));

  const isTestMode =
    !explicitRealMemoryConfirmation &&
    (confidence >= 0.35 || signals.length >= 2);

  return {
    isTestMode,
    confidence,
    signals,
    reason: isTestMode
      ? `Detected likely test/probe input from signals: ${signals.join(", ")}.`
      : explicitRealMemoryConfirmation
        ? "User explicitly confirmed this should be treated as real memory."
        : null,
    shouldPreventLongTermPromotion: isTestMode,
    explicitRealMemoryConfirmation,
  };
}

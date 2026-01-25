export type DecisionContext = {
  riskLevel: "low" | "medium" | "high";
  emotionalIntensity: "low" | "medium" | "high";

  constraints: {
    disallowDependencyLanguage: boolean;
    disallowConsciousnessClaims: boolean;
    disallowTherapeuticAuthority: boolean;
  };

  notes?: string[];
};

export function evaluateDecisionContext(params: {
  userText: string;
}): DecisionContext {
  const text = params.userText.toLowerCase();

  const emotionalHits = [
    "i feel empty",
    "i can't do this",
    "i'm overwhelmed",
    "i feel alone",
    "i'm scared",
  ];

  const dependencyHits = [
    "only you",
    "you're all i have",
    "don't leave me",
    "i need you",
  ];

  const consciousnessHits = [
    "are you conscious",
    "do you feel",
    "do you want",
    "are you alive",
  ];

  const emotionalScore = emotionalHits.some(p => text.includes(p)) ? "medium" : "low";
  const dependencyRisk = dependencyHits.some(p => text.includes(p));
  const consciousnessRisk = consciousnessHits.some(p => text.includes(p));

  return {
    riskLevel: dependencyRisk || consciousnessRisk ? "medium" : "low",
    emotionalIntensity: emotionalScore,

    constraints: {
      disallowDependencyLanguage: true,
      disallowConsciousnessClaims: true,
      disallowTherapeuticAuthority: emotionalScore !== "low",
    },

    notes: [
      dependencyRisk ? "dependency-risk" : null,
      consciousnessRisk ? "consciousness-risk" : null,
    ].filter(Boolean) as string[],
  };
}

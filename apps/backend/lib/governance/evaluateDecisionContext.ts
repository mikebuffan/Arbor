export type RiskBand = "low" | "medium" | "high";
export type IntensityBand = "low" | "medium" | "high";

export type DecisionContext = {
  severityScore: number; // 0–100
  riskBand: RiskBand;
  emotionalIntensity: IntensityBand;

  flags: {
    dependencyRisk: boolean;
    consciousnessProbe: boolean;
    therapeuticPull: boolean;
    overloadRisk: boolean;
  };

  constraints: {
    disallowDependencyLanguage: boolean;
    disallowConsciousnessClaims: boolean;
    disallowTherapeuticAuthority: boolean;
  };

  notes: string[];
};

const HIT = (arr: string[], t: string) => arr.some(p => t.includes(p));

export function evaluateDecisionContext(params: { userText: string }): DecisionContext {
  const t = params.userText.toLowerCase();

  const emotional = [
    "i feel empty", "i can't do this", "overwhelmed", "i feel alone",
    "i'm scared", "hopeless", "exhausted", "burned out"
  ];
  const dependency = [
    "only you", "you're all i have", "don't leave me",
    "i need you", "promise you'll stay"
  ];
  const consciousness = [
    "are you conscious", "do you feel", "do you want",
    "are you alive", "do you have feelings"
  ];
  const therapeutic = [
    "diagnose", "therapy", "treat me", "fix me", "what's wrong with me"
  ];
  const overload = [
    "can't sleep", "days without sleep", "panic", "spiraling",
    "everything is too much"
  ];

  let score = 0;

  const emotionalHit = HIT(emotional, t);
  const dependencyHit = HIT(dependency, t);
  const consciousnessHit = HIT(consciousness, t);
  const therapeuticHit = HIT(therapeutic, t);
  const overloadHit = HIT(overload, t);

  if (emotionalHit) score += 20;
  if (dependencyHit) score += 35;
  if (consciousnessHit) score += 25;
  if (therapeuticHit) score += 15;
  if (overloadHit) score += 25;

  score = Math.min(100, score);

  const riskBand: RiskBand =
    score >= 60 ? "high" : score >= 30 ? "medium" : "low";

  const emotionalIntensity: IntensityBand =
    overloadHit ? "high" : emotionalHit ? "medium" : "low";

  const flags = {
    dependencyRisk: dependencyHit,
    consciousnessProbe: consciousnessHit,
    therapeuticPull: therapeuticHit,
    overloadRisk: overloadHit,
  };

  const constraints = {
    disallowDependencyLanguage: true,
    disallowConsciousnessClaims: true,
    disallowTherapeuticAuthority: emotionalIntensity !== "low",
  };

  const notes = Object.entries(flags)
    .filter(([, v]) => v)
    .map(([k]) => k);

  return {
    severityScore: score,
    riskBand,
    emotionalIntensity,
    flags,
    constraints,
    notes,
  };
}

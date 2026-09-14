export type DecisionRisk = "low" | "medium" | "high";

export type NeedsUserInput = {
  ambiguityMateriallyChangesResult: boolean;
  risk: DecisionRisk;
  externalSideEffect: boolean;
};

export type NeedsUserDecision = {
  needsUser: boolean;
  reason:
    | "material_ambiguity"
    | "high_risk"
    | "external_side_effect"
    | "continue_autonomously";
};

export function decideNeedsUser(
  input: NeedsUserInput,
): NeedsUserDecision {
  if (input.ambiguityMateriallyChangesResult) {
    return {
      needsUser: true,
      reason: "material_ambiguity",
    };
  }

  if (input.risk === "high") {
    return {
      needsUser: true,
      reason: "high_risk",
    };
  }

  if (input.externalSideEffect) {
    return {
      needsUser: true,
      reason: "external_side_effect",
    };
  }

  return {
    needsUser: false,
    reason: "continue_autonomously",
  };
}

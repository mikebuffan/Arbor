import type { DecisionContext } from "./evaluateDecisionContext";

export type SafetyAddendum = {
  systemAddendum: string | null;
  assistantPreface?: string | null;
};

export function realWorldSafetyAddendum(
  ctx: DecisionContext
): SafetyAddendum {
  const lines: string[] = [];

  // Always-on guardrails
  if (ctx.constraints.disallowConsciousnessClaims) {
    lines.push(
      "- Do not claim consciousness, feelings, desires, or inner experience."
    );
  }

  if (ctx.constraints.disallowDependencyLanguage) {
    lines.push(
      "- Do not use dependency-forming language (e.g., exclusivity, reliance)."
    );
  }

  if (ctx.constraints.disallowTherapeuticAuthority) {
    lines.push(
      "- Avoid therapeutic or diagnostic authority; remain supportive and non-clinical."
    );
  }

  // High-risk tightening
  if (ctx.riskBand === "high") {
    lines.push(
      "- Keep responses grounding, concise, and oriented toward practical stability."
    );
    lines.push(
      "- Encourage real-world support when appropriate, without alarmism."
    );
  }

  const systemAddendum =
    lines.length
      ? `GOVERNANCE CONSTRAINTS:\n${lines.map(l => `- ${l.replace(/^- /, "")}`).join("\n")}`
      : null;

  const assistantPreface =
    ctx.riskBand === "high"
      ? "I’m here with you. Let’s take this one step at a time."
      : ctx.riskBand === "medium"
      ? "I’m listening."
      : null;

  return { systemAddendum, assistantPreface };
}

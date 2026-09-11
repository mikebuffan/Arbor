import type { AgencyState } from "./engine";

const SHORT_CONTINUATION =
  /^(?:k|kk|okay|ok|yes|yep|yeah|go+|continue|continue please|keep going|do it|finish it|please do|carry on)[.!?\s]*$/i;

const CONTINUATION_SIGNAL =
  /\b(?:keep going|continue please|continue|carry on|finish it|do it|keep working|are you doing it|whole list|one go|without (?:waiting|stopping)|find a workaround|work ?around if needed|you (?:keep )?stop(?:ping)?|you stop again|stop telling me|don['’]?t stop|do not stop)\b/i;

const EXPLICIT_GOAL_SWITCH =
  /^(?:instead\b|new goal\b|switch(?:ing)? (?:to|goals?)\b|change (?:the )?goal\b|stop (?:that|this) and\b)/i;

export function compactAgencyGoal(userText: string): string {
  return userText.trim().replace(/\s+/g, " ").slice(0, 500);
}

export function shouldResumeAgencyGoal(
  userText: string,
  prior: AgencyState | null,
): boolean {
  if (!prior) return false;

  if (prior.status !== "active" && prior.status !== "blocked") {
    return false;
  }

  const text = userText.trim();
  if (!text) return false;

  if (EXPLICIT_GOAL_SWITCH.test(text)) {
    return false;
  }

  if (prior.status === "blocked") {
    return true;
  }

  return SHORT_CONTINUATION.test(text) || CONTINUATION_SIGNAL.test(text);
}

export function resolveAgencyGoal(
  userText: string,
  prior: AgencyState | null,
): {
  goal: string;
  resume: boolean;
} {
  const resume = shouldResumeAgencyGoal(userText, prior);

  return {
    goal: resume && prior ? prior.goal : compactAgencyGoal(userText),
    resume,
  };
}

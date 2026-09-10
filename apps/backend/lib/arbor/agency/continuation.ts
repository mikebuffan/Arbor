import type { AgencyState } from "./engine";

const CONTINUATION =
  /^(?:go|okay|ok|continue|keep going|do it|finish it|yes|yep|yeah|please do|carry on)[.!?\s]*$/i;

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

  return CONTINUATION.test(userText.trim());
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

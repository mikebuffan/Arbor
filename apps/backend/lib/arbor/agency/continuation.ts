import type { AgencyState } from "./engine";

const CONTINUATION =
  /^(?:go|okay|ok|continue|keep going|do it|finish it|yes|yep|yeah|please do|carry on|go ahead)[.!?\s]*$/i;

const PROCESS_CORRECTION =
  /\b(?:don'?t wait(?: for me)?|do not wait(?: for me)?|don'?t ask me|do not ask me|keep working|keep going|you stopped|you didn'?t go|you did(?:n'?t| not) do it|you(?:'re| are) not done|not done yet|finish what you can|do what you can|carry it through|follow through|stop handing it back|don'?t hand it back|why did you stop|you tell me to do my thing|you don'?t do your thing)\b/i;

const STATUS_CHECK =
  /^(?:what now|now what|did you finish|are you done|is it done|what(?:'s| is) going on|where are we|what are we doing|what were we doing|then what)[.!?\s]*$/i;

export function compactAgencyGoal(userText: string): string {
  return userText.trim().replace(/\s+/g, " ").slice(0, 500);
}

function hasUnresolvedWork(prior: AgencyState): boolean {
  return (
    prior.status === "blocked" ||
    prior.unresolvedWork.some((item) => item.trim().length > 0)
  );
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

  if (CONTINUATION.test(text)) return true;

  if (!hasUnresolvedWork(prior)) return false;

  return PROCESS_CORRECTION.test(text) || STATUS_CHECK.test(text);
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

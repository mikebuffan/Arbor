import type { AgencyState } from "./engine";

const SHORT_CONTINUATION =
  /^(?:k|kk|okay|ok|yes|yep|yeah|go+|continue|continue please|keep going|do it|finish it|please do|carry on|go ahead)[.!?\s]*$/i;

const CONTINUATION_SIGNAL =
  /\b(?:keep going|continue please|continue|carry on|finish it|do it|keep working|are you doing it|whole list|one go|without (?:waiting|stopping)|find a workaround|work ?around if needed|you (?:keep )?stop(?:ping)?|you stop again|stop telling me|don['’]?t stop|do not stop)\b/i;

const PROCESS_CORRECTION =
  /\b(?:don'?t wait(?: for me)?|do not wait(?: for me)?|don'?t ask me|do not ask me|you stopped|you didn'?t go|you did(?:n'?t| not) do it|you did it again|you just did it again|you(?:'re| are) not done|not done yet|finish what you can|do what you can|carry it through|follow through|stop handing it back|don'?t hand it back|why did you stop|don'?t make me babysit|do not make me babysit|i don'?t want to tell you to go|i do not want to tell you to go|you tell me to do my thing|you don'?t do your thing)\b/i;

const STATUS_CHECK =
  /^(?:what now|now what|did you finish|are you done|is it done|what(?:'s| is) going on|where are we|what are we doing|what were we doing|then what)[.!?\s]*$/i;

const EXPLICIT_GOAL_SWITCH =
  /^(?:instead\b|new goal\b|switch(?:ing)? (?:to|goals?)\b|change (?:the )?goal\b|stop (?:that|this) and\b)/i;

const BLOCKER_RESOLUTION_SIGNAL =
  /^(?:yes|no|either|neither|use\b|pick\b|choose\b|select\b|go with\b|option\b|(?:the\s+)?(?:first|second|third|fourth|last|former|latter)\b)/i;

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
  if (prior.status !== "active" && prior.status !== "blocked") return false;

  const text = userText.trim();
  if (!text || EXPLICIT_GOAL_SWITCH.test(text)) return false;

  if (SHORT_CONTINUATION.test(text)) return true;
  if (!hasUnresolvedWork(prior)) return false;

  if (
    prior.status === "blocked" &&
    BLOCKER_RESOLUTION_SIGNAL.test(text)
  ) {
    return true;
  }

  return (
    CONTINUATION_SIGNAL.test(text) ||
    PROCESS_CORRECTION.test(text) ||
    STATUS_CHECK.test(text)
  );
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

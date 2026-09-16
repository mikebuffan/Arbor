import type { AgencyState } from "../agency/engine";

const EXPLICIT_CONTINUATION =
  /^(?:k|kk|go+|okay|ok|continue|continue please|keep going|keep working|do it|finish it|yes|yep|yeah|please do|carry on|go ahead)[.!?\s]*$/i;
const CONTINUATION_SIGNAL =
  /\b(?:keep going|keep working|continue(?: please)?|carry on|finish it|do it|follow through|whole list|one go|without (?:waiting|stopping)|find (?:a )?work ?around|work ?around if needed|don['’]?t stop|do not stop|don['’]?t wait(?: for me)?|do not wait(?: for me)?|don['’]?t ask me|do not ask me|stop handing it back|don['’]?t hand it back|don['’]?t make me babysit|do not make me babysit|i don['’]?t want to tell you to go|i do not want to tell you to go|you (?:keep )?stop(?:ping)?|you stop again|you stopped|why did you stop|you did it again|you just did it again|you(?:'re| are) not done|not done yet)\b/i;
const EXPLICIT_SWITCH =
  /(?:^|\b)(?:instead\b|new goal\b|new task|different task|separate task|separate question|switch(?:ing)? (?:to|goals?)|change (?:the )?goal|forget that|drop that|stop (?:that|this)(?: and)?|leave that)\b/i;
const COMPLETION_LANGUAGE =
  /(?:^|\b)(?:done|finished|complete|completed|resolved|fixed|solved)\b/i;
const PRESENCE_TETHER = /^(?:hey\s+)?arbor[.!?\s]*$/i;
const BLOCKER_RESOLUTION_SIGNAL =
  /^(?:yes|no|either|neither|use\b|pick\b|choose\b|select\b|go with\b|option\b|(?:the\s+)?(?:first|second|third|fourth|last|former|latter)\b)/i;
const FOLLOWUP_SIGNAL =
  /\b(?:it|that|this|those|them|again|still|next|then|same|continue|resume|proceed|tests?|code|permission|permissions|access|authorization|connected|reconnected|handled|correction|corrections|memory|voice|agency|subsystem|retrieval|runtime)\b/i;
const STOPWORDS = new Set([
  "about","after","again","also","been","being","could","does","doing","from",
  "have","into","just","make","more","need","please","should","that","their",
  "there","these","they","this","those","through","want","what","when","where",
  "which","with","would","your",
]);

export function hasLiveAgencyGoal(prior: AgencyState | null): prior is AgencyState {
  return Boolean(
    prior &&
      !PRESENCE_TETHER.test(prior.goal.trim()) &&
      (prior.status === "active" || prior.status === "blocked") &&
      prior.unresolvedWork.length > 0,
  );
}

export function explicitlyContinues(userText: string) {
  const text = userText.trim();
  return EXPLICIT_CONTINUATION.test(text) || CONTINUATION_SIGNAL.test(text);
}

export function explicitlySupersedes(userText: string) {
  return EXPLICIT_SWITCH.test(userText.trim());
}

export function explicitlyClosesGoal(userText: string) {
  return COMPLETION_LANGUAGE.test(userText.trim());
}

function significantWords(value: string) {
  return new Set(
    value.toLowerCase().match(/[a-z0-9]+/g)?.filter(
      (word) => word.length >= 4 && !STOPWORDS.has(word),
    ) ?? [],
  );
}

function sharesGoalContext(userText: string, goal: string) {
  const userWords = significantWords(userText);
  const goalWords = significantWords(goal);
  for (const word of userWords) if (goalWords.has(word)) return true;
  return false;
}

function looksLikeContinuationFollowup(userText: string, prior: AgencyState) {
  const text = userText.trim();
  if (CONTINUATION_SIGNAL.test(text) || FOLLOWUP_SIGNAL.test(text)) return true;
  if (prior.status === "blocked" && BLOCKER_RESOLUTION_SIGNAL.test(text)) return true;
  if (
    prior.status === "blocked" &&
    /\b(?:fixed|handled|resolved|cleared|granted|enabled|authorized|connected|reconnected)\b/i.test(text)
  ) return true;
  return sharesGoalContext(text, prior.goal);
}

export function shouldCarryGoal(userText: string, prior: AgencyState | null) {
  if (!hasLiveAgencyGoal(prior)) return false;
  if (explicitlySupersedes(userText)) return false;
  if (explicitlyContinues(userText)) return true;
  return looksLikeContinuationFollowup(userText, prior);
}

export function mergeUnresolvedWork(existing: string[], incoming: string[]) {
  return Array.from(
    new Set([...existing, ...incoming].map((item) => item.trim()).filter(Boolean)),
  );
}

export function newestNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

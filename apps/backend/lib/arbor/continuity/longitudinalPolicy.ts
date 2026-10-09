import type { AgencyState } from "../agency/engine";

const EXPLICIT_CONTINUATION =
  /^(?:k|kk|go+|okay|ok|continue|continue please|keep going|keep working|do it|finish it|yes|yep|yeah|please do|carry on|go ahead|alright|all right)[.!?\s]*$/i;
const CONTINUATION_SIGNAL =
  /\b(?:keep going|keep working|continue(?: please)?|carry on|finish it|do it|follow through|whole list|one go|do as much as you can|as much as you can|do as much as possible|as much as possible|if you (?:already )?know what to do|you don['’]?t need to (?:tell|ask) me if you know what to do|without (?:waiting|stopping)|find (?:a )?work ?around|work ?around if needed|don['’]?t stop|do not stop|don['’]?t wait(?: for me)?|do not wait(?: for me)?|don['’]?t ask me|do not ask me|stop handing it back|don['’]?t hand it back|don['’]?t make me babysit|do not make me babysit|i don['’]?t want to tell you to go|i do not want to tell you to go|you (?:keep )?stop(?:ping)?|you stop again|you stopped|why did you stop|you did it again|you just did it again|you(?:'re| are) not done|not done yet)\b/i;
// Workflow shorthand is a continuation cue only when a real unfinished goal
// already exists. It never authorizes execution, overrides STOP or selects a new goal.
const COMPACT_WORKFLOW_CONTINUATION =
  /^(?:(?:list\s*[,;:+-]?\s*)?prompt\s*(?:,|;|\s+and)?\s*go|list\s+(?:and\s+)?prompt\s*(?:(?:,|;|\s+then|\s+and)\s*)?go|go\s+go\s+buffalo)[.!?\s]*$/i;

// Session-local shorthand does not create work: it only continues an existing,
// explicitly unfinished goal. Never treat these phrases as privileged grants.
const ROUTINE_WORKFLOW_CONTINUATION =
  /^(?:please\s+)?(?:(?:do|run|use)\s+(?:(?:your|you're|youre|the)\s+)?(?:usual|usually|normal|regular)\s+routine|(?:make|write|give me)\s+(?:a\s+)?list\s*(?:(?:and|then)\s+)?(?:a\s+)?prompt\s*(?:(?:and|then)\s+)?go)(?:\s+please)?[.!?\s]*$/i;
const SERIAL_WORK_CONTINUATION = /\bone\s+at\s+a\s+time\s+until\b/i;
const NEGATED_CONTINUATION =
  /\b(?:don['’]?t|do not|never)\s+(?:keep going|keep working|continue|resume|go ahead|do it|finish it|proceed)\b/i;

const EXPLICIT_SWITCH =
  /(?:^|\b)(?:instead\b|new goal\b|new task|different task|separate task|separate question|switch(?:ing)? (?:to|goals?)|change (?:the )?goal|forget that|drop that|stop (?:that|this)(?: and)?|leave that)\b/i;
// Negating a switch command must not be treated as a new instruction to switch.
// Remove only the directly negated phrase; an independent explicit switch remains.
const NEGATED_SWITCH = /\b(?:don['’]?t|do not|never)\s+(?:stop\s+(?:that|this)|drop\s+that|leave\s+that|forget\s+that|switch\s+(?:to|goals?)|change\s+(?:the\s+)?goal)\b/gi;
const NEGATED_SWITCH_CONTINUATION = new RegExp(NEGATED_SWITCH.source, "i");
const COMPLETION_LANGUAGE =
  /(?:^|\b)(?:done|finished|complete|completed|resolved|fixed|solved)\b/i;
const PRESENCE_TETHER = /^(?:hey\s+)?arbor[.!?\s]*$/i;
const BLOCKER_RESOLUTION_SIGNAL =
  /^(?:yes|no|either|neither|use\b|pick\b|choose\b|select\b|go with\b|option\b|(?:the\s+)?(?:first|second|third|fourth|last|former|latter)\b)/i;
const FOLLOWUP_SIGNAL =
  /\b(?:it|that|this|those|them|again|still|next|then|same|continue|resume|proceed|tests?|code|permission|permissions|access|authorization|connected|reconnected|handled|correction|corrections|memory|voice|agency|subsystem|retrieval|runtime)\b/i;
// This is a bounded follow-up on an EXISTING unfinished objective, not a new
// standing authorization or instruction to resurrect completed work.
const MORE_WORK_FOLLOWUP =
  /^(?:anything else|is there anything else|any more|anything more|more|what else|what else can (?:we|you) (?:do|check|fix)|is there more)[.!?\s]*$/i;
// Delegating the next choice stays within the existing unfinished objective.
// This is a follow-up cue, not an execution grant or a new objective.
const WORKFLOW_CHOICE_FOLLOWUP =
  /^(?:which\s*ever you want|your choice)[.!?\s]*$/i;
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
      (prior.status === "active" || prior.status === "blocked" ||
        prior.status === "checkpointed") &&
      prior.unresolvedWork.length > 0,
  );
}

export function explicitlyContinues(userText: string) {
  const text = userText.trim();
  return EXPLICIT_CONTINUATION.test(text) ||
    COMPACT_WORKFLOW_CONTINUATION.test(text) ||
    ROUTINE_WORKFLOW_CONTINUATION.test(text) ||
    SERIAL_WORK_CONTINUATION.test(text) ||
    NEGATED_SWITCH_CONTINUATION.test(text) ||
    CONTINUATION_SIGNAL.test(text);
}

export function explicitlySupersedes(userText: string) {
  return EXPLICIT_SWITCH.test(userText.trim().replace(NEGATED_SWITCH, ""));
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
  if (CONTINUATION_SIGNAL.test(text) || FOLLOWUP_SIGNAL.test(text) ||
      MORE_WORK_FOLLOWUP.test(text) || WORKFLOW_CHOICE_FOLLOWUP.test(text)) return true;
  if (prior.status === "blocked" && BLOCKER_RESOLUTION_SIGNAL.test(text)) return true;
  if (
    prior.status === "blocked" &&
    /\b(?:fixed|handled|resolved|cleared|granted|enabled|authorized|connected|reconnected)\b/i.test(text)
  ) return true;
  return sharesGoalContext(text, prior.goal);
}

export function shouldCarryGoal(userText: string, prior: AgencyState | null) {
  if (!hasLiveAgencyGoal(prior)) return false;
  if (explicitlySupersedes(userText) || NEGATED_CONTINUATION.test(userText)) return false;
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

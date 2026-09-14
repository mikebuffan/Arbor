import {
  suspendForForeground,
  supersedeForeground,
} from "./openLoops.js";
import type {
  ArborState,
} from "./types.js";

const EXPLICIT_CONTINUATION =
  /^(?:go|okay|ok|continue|keep going|do it|finish it|yes|yep|yeah|please do|carry on)[.!?\s]*$/i;

const EXPLICIT_SWITCH =
  /(?:^|\b)(?:new task|different task|separate task|separate question|switch(?:ing)? to|forget that|drop that|stop that|leave that)\b/i;

const COMPLETION_LANGUAGE =
  /(?:^|\b)(?:done|finished|complete|completed|resolved|fixed|solved)\b/i;

const FOLLOWUP_SIGNAL =
  /\b(?:it|that|this|those|them|again|still|next|then|same|continue|resume|proceed|tests?|code|permission|permissions|access|authorization|connected|reconnected|handled)\b/i;

const STOPWORDS = new Set([
  "about", "after", "again", "also", "been", "being", "could", "does",
  "doing", "from", "have", "into", "just", "make", "more", "need",
  "please", "should", "that", "their", "there", "these", "they", "this",
  "those", "through", "want", "what", "when", "where", "which", "with",
  "would", "your",
]);

export function hasLiveArborGoal(
  prior: ArborState | null,
): prior is ArborState {
  return Boolean(
    prior?.goal?.trim() &&
    prior.unresolvedWork.length > 0,
  );
}

export function explicitlyContinues(
  userText: string,
): boolean {
  return EXPLICIT_CONTINUATION.test(
    userText.trim(),
  );
}

export function explicitlySupersedes(
  userText: string,
): boolean {
  return EXPLICIT_SWITCH.test(
    userText.trim(),
  );
}

export function explicitlyClosesGoal(
  userText: string,
): boolean {
  return COMPLETION_LANGUAGE.test(
    userText.trim(),
  );
}

function significantWords(
  value: string,
): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter(
        (word) =>
          word.length >= 4 &&
          !STOPWORDS.has(word),
      ) ?? [],
  );
}

function sharesGoalContext(
  userText: string,
  goal: string,
): boolean {
  const userWords = significantWords(userText);
  const goalWords = significantWords(goal);

  for (const word of userWords) {
    if (goalWords.has(word)) return true;
  }

  return false;
}

function looksLikeContinuationFollowup(
  userText: string,
  prior: ArborState,
): boolean {
  const text = userText.trim();

  if (FOLLOWUP_SIGNAL.test(text)) return true;

  if (
    sharesGoalContext(
      text,
      prior.goal ?? "",
    )
  ) {
    return true;
  }

  // The current goal is deliberately compact. A natural follow-up often names
  // the concrete unfinished step rather than repeating the goal wording, so
  // unresolved work is part of continuation context too.
  return prior.unresolvedWork.some(
    (work) =>
      sharesGoalContext(
        text,
        work,
      ),
  );
}

function replaceStateInPlace(
  target: ArborState,
  next: ArborState,
): void {
  for (const key of Object.keys(target) as Array<keyof ArborState>) {
    delete (target as any)[key];
  }
  Object.assign(target, next);
}

/**
 * Compatibility note: the existing runtime asks this function only for a
 * boolean. To avoid a risky runtime rewrite, this policy also prepares the
 * host-owned transition on the freshly-loaded mutable state object. Related
 * follow-ups leave it untouched; unrelated turns suspend the old objective;
 * explicit switches clear the old stack.
 */
export function shouldCarryGoal(
  userText: string,
  prior: ArborState | null,
): boolean {
  if (!hasLiveArborGoal(prior)) {
    return false;
  }

  if (explicitlySupersedes(userText)) {
    replaceStateInPlace(
      prior,
      supersedeForeground(
        prior,
        userText,
      ),
    );
    return false;
  }

  if (explicitlyContinues(userText)) {
    return true;
  }

  if (looksLikeContinuationFollowup(userText, prior)) {
    return true;
  }

  replaceStateInPlace(
    prior,
    suspendForForeground(
      prior,
      userText,
    ),
  );

  return false;
}

export function mergeUnresolvedWork(
  existing: string[],
  incoming: string[],
): string[] {
  return Array.from(
    new Set(
      [...existing, ...incoming]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function newestNonEmpty(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }

  return null;
}

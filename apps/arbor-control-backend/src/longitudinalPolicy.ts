import type {
  ArborState,
} from "./types.js";

const EXPLICIT_CONTINUATION =
  /^(?:go|okay|ok|continue|keep going|do it|finish it|yes|yep|yeah|please do|carry on|pull it up|bring it back|we just made|pick up where we left off)[.!?\s]*$/i;

const EXPLICIT_SWITCH =
  /(?:^|\b)(?:new task|different task|separate task|separate question|switch(?:ing)? to|forget that|drop that|stop that|leave that)\b/i;

const COMPLETION_LANGUAGE =
  /(?:^|\b)(?:done|finished|complete|completed|resolved|fixed|solved)\b/i;

const OPEN_LOOP_SIGNALS = [
  "need to",
  "we need",
  "next",
  "later",
  "todo",
  "unfinished",
  "open loop",
  "follow up",
  "still needs",
  "not done",
  "after this",
  "current priority",
] as const;

function normalizeText(
  value:
    string |
    null |
    undefined,
): string {
  return (
    value ?? ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " ",
    );
}

function includesAny(
  text:
    string,
  needles:
    readonly string[],
): boolean {
  return needles.some(
    (needle) =>
      text.includes(
        needle,
      ),
  );
}

/**
 * Recovered from Arbor Master File Code lineage.
 * Open/unfinished work is deliberately weighted above ordinary recency.
 */
export function scoreOpenLoopRelevance({
  itemText,
  userMessage,
}: {
  itemText: string;
  userMessage?:
    string |
    null;
}): number {
  const text =
    `${normalizeText(itemText)} ${normalizeText(userMessage)}`;

  if (
    includesAny(
      text,
      OPEN_LOOP_SIGNALS,
    )
  ) {
    return 0.7;
  }

  return 0;
}

export function hasLiveArborGoal(
  prior:
    ArborState | null,
): prior is ArborState {
  return Boolean(
    prior?.goal?.trim() &&
    prior.unresolvedWork.length > 0,
  );
}

export function explicitlyContinues(
  userText:
    string,
): boolean {
  return EXPLICIT_CONTINUATION.test(
    userText.trim(),
  );
}

export function explicitlySupersedes(
  userText:
    string,
): boolean {
  return EXPLICIT_SWITCH.test(
    userText.trim(),
  );
}

export function explicitlyClosesGoal(
  userText:
    string,
): boolean {
  return COMPLETION_LANGUAGE.test(
    userText.trim(),
  );
}

/**
 * Old continuity rule carried forward:
 * - a resume cue resolves to the last confirmed object;
 * - an ordinary follow-up keeps unfinished work alive;
 * - only an explicit switch supersedes the active branch.
 *
 * Resume cues may restore a confirmed goal even if unresolvedWork was
 * accidentally emptied on the immediately prior turn.
 */
export function shouldCarryGoal(
  userText:
    string,
  prior:
    ArborState | null,
): boolean {
  if (
    !prior?.goal?.trim()
  ) {
    return false;
  }

  if (
    explicitlySupersedes(
      userText,
    )
  ) {
    return false;
  }

  if (
    explicitlyContinues(
      userText,
    )
  ) {
    return true;
  }

  return hasLiveArborGoal(
    prior,
  );
}

export function mergeUnresolvedWork(
  existing:
    string[],
  incoming:
    string[],
): string[] {
  return Array.from(
    new Set(
      [
        ...existing,
        ...incoming,
      ]
        .map(
          (item) =>
            item.trim(),
        )
        .filter(
          Boolean,
        ),
    ),
  );
}

export function rankUnresolvedWork(
  unresolvedWork:
    string[],
  userMessage?:
    string |
    null,
): string[] {
  return [
    ...unresolvedWork,
  ].sort(
    (a, b) =>
      scoreOpenLoopRelevance({
        itemText: b,
        userMessage,
      }) -
      scoreOpenLoopRelevance({
        itemText: a,
        userMessage,
      }),
  );
}

export function newestNonEmpty(
  ...values:
    Array<
      string |
      null |
      undefined
    >
): string | null {
  for (
    const value
    of values
  ) {
    const trimmed =
      value?.trim();

    if (
      trimmed
    ) {
      return trimmed;
    }
  }

  return null;
}

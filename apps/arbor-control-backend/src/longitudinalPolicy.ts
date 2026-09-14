import type {
  ArborState,
} from "./types.js";

const EXPLICIT_CONTINUATION =
  /^(?:go|okay|ok|continue|keep going|do it|finish it|yes|yep|yeah|please do|carry on)[.!?\s]*$/i;

const EXPLICIT_SWITCH =
  /(?:^|\b)(?:new task|different task|separate task|separate question|switch(?:ing)? to|forget that|drop that|stop that|leave that)\b/i;

const COMPLETION_LANGUAGE =
  /(?:^|\b)(?:done|finished|complete|completed|resolved|fixed|solved)\b/i;

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

export function shouldCarryGoal(
  userText:
    string,
  prior:
    ArborState | null,
): boolean {
  if (
    !hasLiveArborGoal(
      prior,
    )
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

  return true;
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

import type { AgencyState } from "../agency/engine";

const EXPLICIT_CONTINUATION =
  /^(?:go|okay|ok|continue|keep going|do it|finish it|yes|yep|yeah|please do|carry on)[.!?\s]*$/i;

const EXPLICIT_SWITCH =
  /(?:^|\b)(?:new task|different task|separate task|separate question|switch(?:ing)? to|instead|forget that|drop that|stop that|leave that|now i need|now i want|actually i need|actually i want)\b/i;

const COMPLETION_LANGUAGE =
  /(?:^|\b)(?:done|finished|complete|completed|resolved|fixed|solved)\b/i;

export function hasLiveAgencyGoal(
  prior: AgencyState | null,
): prior is AgencyState {
  return Boolean(
    prior &&
      (prior.status === "active" ||
        prior.status === "blocked"),
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

export function shouldCarryGoal(
  userText: string,
  prior: AgencyState | null,
): boolean {
  if (!hasLiveAgencyGoal(prior)) {
    return false;
  }

  if (explicitlySupersedes(userText)) {
    return false;
  }

  return true;
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
  ...values: Array<
    string | null | undefined
  >
): string | null {
  for (const value of values) {
    const trimmed = value?.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

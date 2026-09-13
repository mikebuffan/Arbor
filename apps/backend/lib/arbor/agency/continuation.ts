import type { AgencyState } from "./engine";
import {
  explicitlyContinues,
  explicitlySupersedes,
  shouldCarryGoal,
} from "../continuity/longitudinalPolicy";

export function compactAgencyGoal(
  userText: string,
): string {
  return userText
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 500);
}

export function shouldResumeAgencyGoal(
  userText: string,
  prior: AgencyState | null,
): boolean {
  return shouldCarryGoal(
    userText,
    prior,
  );
}

export function resolveAgencyGoal(
  userText: string,
  prior: AgencyState | null,
): {
  goal: string;
  resume: boolean;
  superseded: boolean;
} {
  const superseded =
    explicitlySupersedes(userText);

  const resume =
    !superseded &&
    shouldCarryGoal(
      userText,
      prior,
    );

  if (resume && prior) {
    return {
      goal: prior.goal,
      resume: true,
      superseded: false,
    };
  }

  return {
    goal:
      compactAgencyGoal(userText),
    resume: false,
    superseded,
  };
}

export function isExplicitContinuation(
  userText: string,
): boolean {
  return explicitlyContinues(
    userText,
  );
}

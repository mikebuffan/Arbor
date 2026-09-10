import type { ArborWorkState } from "./workState";

export type RecoveryDisposition =
  | "retry"
  | "alternate_route"
  | "block"
  | "ask_user";

export type RecoveryDecision = {
  disposition: RecoveryDisposition;
  reason: string;
};

export function chooseRecovery(input: {
  attemptCount: number;
  sameFailureCount: number;
  alternateRouteAvailable: boolean;
  needsUserAuthority: boolean;
  irreversible: boolean;
}): RecoveryDecision {
  if (
    input.needsUserAuthority ||
    input.irreversible
  ) {
    return {
      disposition: "ask_user",
      reason:
        "continuing requires user authority or crosses an irreversible boundary",
    };
  }

  if (
    input.sameFailureCount >= 2 &&
    input.alternateRouteAvailable
  ) {
    return {
      disposition: "alternate_route",
      reason:
        "the same route has failed repeatedly and another valid route exists",
    };
  }

  if (input.attemptCount < 2) {
    return {
      disposition: "retry",
      reason:
        "the failure may be transient and retry budget remains",
    };
  }

  if (input.alternateRouteAvailable) {
    return {
      disposition: "alternate_route",
      reason:
        "retry budget is exhausted and another valid route exists",
    };
  }

  return {
    disposition: "block",
    reason:
      "no authorized reversible recovery route remains",
  };
}

export type StatefulRecoveryDecision =
  | {
      kind: "alternate";
      nextAction: string;
      reason: string;
    }
  | {
      kind: "retry";
      nextAction: string;
      reason: string;
    }
  | {
      kind: "block";
      nextAction: null;
      reason: string;
    };

export function decideRecovery(
  state: ArborWorkState,
  input: {
    failedStrategy?: string;
    alternateActions?: string[];
    requiresAuthority?: boolean;
    irreversible?: boolean;
  },
): StatefulRecoveryDecision {
  if (
    input.requiresAuthority ||
    input.irreversible
  ) {
    return {
      kind: "block",
      nextAction: null,
      reason:
        "recovery requires authority or crosses an irreversible boundary",
    };
  }

  const failed =
    input.failedStrategy?.trim() || null;

  const attempted = new Set(
    state.attemptedStrategies,
  );

  if (failed) {
    attempted.add(failed);
  }

  const alternate =
    (input.alternateActions ?? []).find(
      (candidate) =>
        candidate.trim() &&
        !attempted.has(candidate),
    ) ?? null;

  if (alternate) {
    return {
      kind: "alternate",
      nextAction: alternate,
      reason:
        "an authorized untried alternate route remains",
    };
  }

  if (failed && state.nextAction === failed) {
    return {
      kind: "retry",
      nextAction: failed,
      reason:
        "no alternate route is available; one controlled retry remains",
    };
  }

  return {
    kind: "block",
    nextAction: null,
    reason:
      "no authorized untried recovery route remains",
  };
}

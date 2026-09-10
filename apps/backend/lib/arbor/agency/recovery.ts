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
  if (input.needsUserAuthority || input.irreversible) {
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

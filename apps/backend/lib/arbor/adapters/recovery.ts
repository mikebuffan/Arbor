import type {
  ArborAdapterFailure,
} from "./result";

export type AdapterRecoveryDecision =
  | {
      kind: "retry";
      reason: string;
    }
  | {
      kind: "alternate";
      route: string;
      reason: string;
    }
  | {
      kind: "block";
      reason: string;
    };

export function decideAdapterRecovery(
  failure: ArborAdapterFailure,
  attemptedRoutes: string[],
): AdapterRecoveryDecision {
  if (
    failure.kind === "irreversible_boundary" ||
    failure.kind === "high_consequence_boundary" ||
    failure.kind === "authorization"
  ) {
    return {
      kind: "block",
      reason: failure.error,
    };
  }

  const alternate =
    (failure.alternateRoutes ?? [])
      .find((route) =>
        !attemptedRoutes.includes(route),
      );

  if (alternate) {
    return {
      kind: "alternate",
      route: alternate,
      reason: failure.error,
    };
  }

  if (failure.retryable) {
    return {
      kind: "retry",
      reason: failure.error,
    };
  }

  return {
    kind: "block",
    reason: failure.error,
  };
}

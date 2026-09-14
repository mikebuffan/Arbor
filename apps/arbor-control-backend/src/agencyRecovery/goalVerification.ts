export interface ArborGoalVerificationContext<T> {
  goal: string;
  primaryAction: string;
  recoveryRouteId: string;
  recoveryDescription: string;
  recoveredValue: T;
}

export interface ArborGoalVerificationResult {
  preserved: boolean;
  confidence: number;
  evidence: string[];
}

export interface ArborGoalVerifier<T> {
  verify(
    context: ArborGoalVerificationContext<T>,
  ): Promise<ArborGoalVerificationResult>;
}

export class AcceptDeclaredGoalVerifier<T>
  implements ArborGoalVerifier<T> {
  async verify(
    context: ArborGoalVerificationContext<T>,
  ): Promise<ArborGoalVerificationResult> {
    return {
      preserved: true,
      confidence: 0.5,
      evidence: [
        `GOAL_VERIFICATION_DECLARATIVE_FALLBACK:${context.recoveryRouteId}`,
      ],
    };
  }
}

export class PredicateGoalVerifier<T>
  implements ArborGoalVerifier<T> {
  constructor(
    private readonly predicate: (
      context: ArborGoalVerificationContext<T>,
    ) => boolean | Promise<boolean>,
    private readonly confidence: number = 1,
  ) {}

  async verify(
    context: ArborGoalVerificationContext<T>,
  ): Promise<ArborGoalVerificationResult> {
    const preserved = await this.predicate(context);

    return {
      preserved,
      confidence: this.confidence,
      evidence: [
        preserved
          ? `GOAL_VERIFIED:${context.recoveryRouteId}`
          : `GOAL_NOT_PRESERVED:${context.recoveryRouteId}`,
      ],
    };
  }
}

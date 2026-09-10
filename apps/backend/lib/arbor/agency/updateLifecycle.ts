import type {
  ArborBehaviorProof,
} from "../behavior/behaviorProjection";

import {
  evaluateSelfUpdateWithIdentityGuard,
  type SelfUpdateDecision,
} from "./selfUpdate";

export type PendingSelfUpdate = {
  id: string;
  strategy: string;
  beforeScore: number;
  afterScore: number;
  verificationCount: number;
  newFailureIntroduced: boolean;
  beforeBehavior: ArborBehaviorProof;
  afterBehavior: ArborBehaviorProof;
  protectedCorrectionsBefore: string[];
  protectedCorrectionsAfter: string[];
  createdAt: string;
  updatedAt: string;
};

export type SelfUpdateLifecycleResult = {
  update: PendingSelfUpdate;
  decision: SelfUpdateDecision;
};

export function beginSelfUpdate(input: {
  id: string;
  strategy: string;
  baselineScore: number;
  behavior: ArborBehaviorProof;
  protectedCorrections: string[];
  now: string;
}): PendingSelfUpdate {
  return {
    id: input.id,
    strategy: input.strategy.trim(),
    beforeScore: input.baselineScore,
    afterScore: input.baselineScore,
    verificationCount: 0,
    newFailureIntroduced: false,
    beforeBehavior: input.behavior,
    afterBehavior: input.behavior,
    protectedCorrectionsBefore: [...input.protectedCorrections],
    protectedCorrectionsAfter: [...input.protectedCorrections],
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function recordSelfUpdateVerification(
  update: PendingSelfUpdate,
  input: {
    score: number;
    behavior: ArborBehaviorProof;
    protectedCorrections: string[];
    newFailureIntroduced?: boolean;
    now: string;
  },
): PendingSelfUpdate {
  return {
    ...update,
    afterScore: input.score,
    afterBehavior: input.behavior,
    protectedCorrectionsAfter: [...input.protectedCorrections],
    verificationCount: update.verificationCount + 1,
    newFailureIntroduced:
      update.newFailureIntroduced ||
      Boolean(input.newFailureIntroduced),
    updatedAt: input.now,
  };
}

export function decideSelfUpdate(
  update: PendingSelfUpdate,
): SelfUpdateLifecycleResult {
  return {
    update,
    decision: evaluateSelfUpdateWithIdentityGuard({
      beforeScore: update.beforeScore,
      afterScore: update.afterScore,
      verificationCount: update.verificationCount,
      newFailureIntroduced: update.newFailureIntroduced,
      beforeBehavior: update.beforeBehavior,
      afterBehavior: update.afterBehavior,
      protectedCorrectionsBefore:
        update.protectedCorrectionsBefore,
      protectedCorrectionsAfter:
        update.protectedCorrectionsAfter,
    }),
  };
}

export function durableStrategyFromUpdate(
  result: SelfUpdateLifecycleResult,
): string | null {
  return result.decision.disposition === "retain"
    ? result.update.strategy
    : null;
}

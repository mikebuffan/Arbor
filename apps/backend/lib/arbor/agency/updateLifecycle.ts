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
  // Host-observed verifier response IDs, not independently verified outcomes.
  // Older snapshots without IDs have no attributable verification count.
  verificationIds?: string[];
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
    verificationIds: [],
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
    // Provided by the trusted verifier callback, never the user or model text.
    verificationId?: string;
    behavior: ArborBehaviorProof;
    protectedCorrections: string[];
    newFailureIntroduced?: boolean;
    now: string;
  },
): PendingSelfUpdate {
  // An invalid score is an observation, not a completed verification.
  // Preserve any observed safety/identity regression but do not allow an
  // unscorable attempt to contribute to the two-check retention threshold.
  const id = input.verificationId?.trim() ?? "";
  const knownIds = Array.isArray(update.verificationIds)
    ? update.verificationIds.filter((value) =>
        typeof value === "string" && /^[A-Za-z0-9._:-]{4,200}$/.test(value))
    : [];
  const scoreVerifiable =
    Number.isFinite(input.score) &&
    Number.isFinite(update.beforeScore) &&
    Number.isFinite(input.score - update.beforeScore);
  const distinctVerification =
    scoreVerifiable &&
    /^[A-Za-z0-9._:-]{4,200}$/.test(id) &&
    !knownIds.includes(id);
  const verificationIds = distinctVerification
    ? [...knownIds, id].slice(-64)
    : knownIds;

  return {
    ...update,
    afterScore: distinctVerification ? input.score : update.afterScore,
    afterBehavior: distinctVerification ? input.behavior : update.afterBehavior,
    protectedCorrectionsAfter: distinctVerification
      ? [...input.protectedCorrections]
      : update.protectedCorrectionsAfter,
    verificationIds,
    verificationCount: verificationIds.length,
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

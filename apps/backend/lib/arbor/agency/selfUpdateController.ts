import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArborBehaviorProof } from "@/lib/arbor/behavior/behaviorProjection";
import {
  evaluateSelfUpdateWithIdentityGuard,
  type SelfUpdateDecision,
} from "./selfUpdate";
import {
  loadAgencyState,
  persistAgencyState,
} from "./state";

export type SelfUpdateCandidate = {
  strategy: string;
  beforeScore: number;
  afterScore: number;
  verificationCount: number;
  beforeBehavior: ArborBehaviorProof;
  afterBehavior: ArborBehaviorProof;
  protectedCorrectionsBefore: string[];
  protectedCorrectionsAfter: string[];
  newFailureIntroduced: boolean;
};

export type SelfUpdateResult = {
  decision: SelfUpdateDecision;
  retainedStrategies: string[];
};

function uniqueRecent(values: string[], max = 20): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).slice(-max);
}

export async function applyVerifiedSelfUpdate(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  candidate: SelfUpdateCandidate;
}): Promise<SelfUpdateResult> {
  const current = await loadAgencyState({
    supabase: input.supabase,
    userId: input.userId,
    projectId: input.projectId,
  });

  const decision = evaluateSelfUpdateWithIdentityGuard({
    beforeScore: input.candidate.beforeScore,
    afterScore: input.candidate.afterScore,
    verificationCount: input.candidate.verificationCount,
    newFailureIntroduced: input.candidate.newFailureIntroduced,
    beforeBehavior: input.candidate.beforeBehavior,
    afterBehavior: input.candidate.afterBehavior,
    protectedCorrectionsBefore:
      input.candidate.protectedCorrectionsBefore,
    protectedCorrectionsAfter:
      input.candidate.protectedCorrectionsAfter,
  });

  if (!current) {
    return {
      decision,
      retainedStrategies: [],
    };
  }

  const retainedStrategies =
    decision.disposition === "retain"
      ? uniqueRecent([
          ...current.strategyNotes,
          input.candidate.strategy,
        ])
      : uniqueRecent(
          current.strategyNotes.filter(
            (strategy) =>
              strategy.trim() !== input.candidate.strategy.trim(),
          ),
        );

  await persistAgencyState({
    supabase: input.supabase,
    userId: input.userId,
    projectId: input.projectId,
    agency: {
      ...current,
      strategyNotes: retainedStrategies,
    },
  });

  return {
    decision,
    retainedStrategies,
  };
}

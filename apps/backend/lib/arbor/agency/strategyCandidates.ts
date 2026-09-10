import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingRuntimeTable } from "@/lib/arbor/runtime/missingRuntimeTable";
import { evaluateSelfUpdate } from "./selfUpdate";
import {
  loadAgencyState,
  persistAgencyState,
} from "./state";

type CandidateRow = {
  strategy: string;
  success_count: number;
  failure_count: number;
  status: "candidate" | "retained" | "reverted";
};

export async function observeStrategyCandidate(input: {
  supabase: SupabaseClient;
  userId: string;
  projectId: string;
  strategy: string;
  verificationPassed: boolean;
}): Promise<{
  status: CandidateRow["status"];
  successCount: number;
  failureCount: number;
}> {
  const strategy = input.strategy.trim();

  if (!strategy) {
    throw new Error("agency_strategy_candidate_empty");
  }

  const { data, error } = await input.supabase
    .from("arbor_agency_strategy_candidates")
    .select("strategy,success_count,failure_count,status")
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .eq("strategy", strategy)
    .maybeSingle();

  if (error && !isMissingRuntimeTable(error)) {
    throw error;
  }

  const current = (data as CandidateRow | null) ?? {
    strategy,
    success_count: 0,
    failure_count: 0,
    status: "candidate" as const,
  };

  if (current.status !== "candidate") {
    return {
      status: current.status,
      successCount: current.success_count,
      failureCount: current.failure_count,
    };
  }

  const successCount =
    current.success_count + (input.verificationPassed ? 1 : 0);

  const failureCount =
    current.failure_count + (input.verificationPassed ? 0 : 1);

  const decision = evaluateSelfUpdate({
    beforeScore: 0,
    afterScore: successCount >= 2 ? 1 : 0,
    verificationCount: successCount,
    identityRegression: false,
    newFailureIntroduced: failureCount >= 2,
  });

  const status: CandidateRow["status"] =
    decision.disposition === "retain"
      ? "retained"
      : decision.disposition === "revert"
        ? "reverted"
        : "candidate";

  const { error: writeError } = await input.supabase
    .from("arbor_agency_strategy_candidates")
    .upsert(
      {
        user_id: input.userId,
        project_id: input.projectId,
        strategy,
        success_count: successCount,
        failure_count: failureCount,
        status,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,project_id,strategy",
      },
    );

  if (writeError && !isMissingRuntimeTable(writeError)) {
    throw writeError;
  }

  if (status === "retained") {
    const agency = await loadAgencyState(input);

    if (agency) {
      const strategyNotes = Array.from(
        new Set([
          ...agency.strategyNotes,
          strategy,
        ]),
      ).slice(-20);

      await persistAgencyState({
        ...input,
        agency: {
          ...agency,
          strategyNotes,
        },
      });
    }
  }

  return {
    status,
    successCount,
    failureCount,
  };
}

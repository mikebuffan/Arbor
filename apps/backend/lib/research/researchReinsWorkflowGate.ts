export const RESEARCH_REINS_PREVIEW_BRANCH =
  "feature/research-offline-pdf-batch-pilot-20260923";
export const RESEARCH_REINS_PREVIEW_DATABASE_URL =
  "https://tzbpjbhroxiqftqwatnb.supabase.co";

export type ResearchReinsWorkflowGate = {
  enabled: boolean;
  failedChecks: string[];
};

export function researchReinsWorkflowGate(
  env: Record<string, string | undefined> = process.env,
): ResearchReinsWorkflowGate {
  const failedChecks: string[] = [];
  const databaseUrl =
    env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (env.ARBOR_RESEARCH_REINS_WORKFLOW_ENABLED !== "true") {
    failedChecks.push("reins_workflow_flag_off");
  }
  if (env.VERCEL_ENV !== "preview") {
    failedChecks.push("not_vercel_preview");
  }
  if (env.VERCEL_GIT_COMMIT_REF !== RESEARCH_REINS_PREVIEW_BRANCH) {
    failedChecks.push("wrong_git_branch");
  }
  if (databaseUrl !== RESEARCH_REINS_PREVIEW_DATABASE_URL) {
    failedChecks.push("wrong_database");
  }

  return {
    enabled: failedChecks.length === 0,
    failedChecks,
  };
}

export function requireResearchReinsWorkflowGate(
  env: Record<string, string | undefined> = process.env,
): void {
  const gate = researchReinsWorkflowGate(env);
  if (!gate.enabled) {
    throw new Error(
      "research_reins_workflow_gate_closed:" +
        gate.failedChecks.join(","),
    );
  }
}

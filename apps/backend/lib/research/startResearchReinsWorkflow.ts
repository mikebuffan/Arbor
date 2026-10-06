import {
  requireResearchReinsWorkflowGate,
} from "./researchReinsWorkflowGate";

/**
 * Provider seam only. The Vercel Workflow SDK/runtime is intentionally not
 * installed in the current One Arbor source candidate. Keep the public start
 * surface fail-closed until that separately reviewed Vercel work resumes.
 */
export async function startResearchReinsWorkflow(
  runId: string,
): Promise<never> {
  const clean = runId.trim();
  if (!clean) {
    throw new Error("research_reins_run_id_required");
  }

  requireResearchReinsWorkflowGate();
  throw new Error("research_reins_workflow_provider_not_installed");
}

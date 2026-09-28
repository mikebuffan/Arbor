import { start } from "workflow/api";
import {
  researchReinsWorkflow,
} from "@/workflows/researchReinsWorkflow";
import {
  requireResearchReinsWorkflowGate,
} from "./researchReinsWorkflowGate";

export async function startResearchReinsWorkflow(
  runId: string,
) {
  const clean = runId.trim();
  if (!clean) {
    throw new Error("research_reins_run_id_required");
  }

  // Starting a durable wake loop is itself separately gated from creating the
  // queued ARK/run contract. Default source/deploy state remains OFF.
  requireResearchReinsWorkflowGate();

  return start(
    researchReinsWorkflow,
    [{ runId: clean }],
  );
}

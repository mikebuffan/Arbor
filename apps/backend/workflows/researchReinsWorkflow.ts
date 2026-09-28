import { sleep } from "workflow";
import {
  runResearchReinsArkPulse,
  type ResearchReinsArkPulseResult,
} from "@/lib/research/researchReinsArkHost";
import {
  researchReinsWorkflowGate,
} from "@/lib/research/researchReinsWorkflowGate";

export type ResearchReinsWorkflowInput = {
  runId: string;
};

export type ResearchReinsWorkflowResult = {
  runId: string;
  status: "stopped";
  reason: string;
  pulses: number;
  lastPulse: ResearchReinsArkPulseResult | null;
};

async function runOneResearchReinsArkPulse(
  runId: string,
): Promise<ResearchReinsArkPulseResult> {
  "use step";

  const gate = researchReinsWorkflowGate();
  if (!gate.enabled) {
    return {
      action: "stop",
      reason:
        "research_reins_workflow_gate_closed:" +
        gate.failedChecks.join(","),
      worker: null,
      binding: null,
    };
  }

  return runResearchReinsArkPulse({ runId });
}

/**
 * Durable wake provider only.
 *
 * Arbor/ARK/research persistence remains authoritative. Workflow holds only
 * the opaque run ID and a pulse counter; every step re-resolves authorization,
 * budgets, STOP state and the pinned ARK objective from Supabase before work.
 */
export async function researchReinsWorkflow(
  input: ResearchReinsWorkflowInput,
): Promise<ResearchReinsWorkflowResult> {
  "use workflow";

  if (!input?.runId?.trim()) {
    return {
      runId: "",
      status: "stopped",
      reason: "research_reins_run_id_required",
      pulses: 0,
      lastPulse: null,
    };
  }

  let lastPulse: ResearchReinsArkPulseResult | null = null;

  for (let pulses = 1; pulses <= 1000; pulses += 1) {
    lastPulse = await runOneResearchReinsArkPulse(input.runId);

    if (lastPulse.action === "stop") {
      return {
        runId: input.runId,
        status: "stopped",
        reason: lastPulse.reason,
        pulses,
        lastPulse,
      };
    }

    const delaySeconds = Math.min(
      300,
      Math.max(1, lastPulse.delaySeconds ?? 30),
    );
    await sleep(delaySeconds + " seconds");
  }

  return {
    runId: input.runId,
    status: "stopped",
    reason: "research_reins_workflow_pulse_limit",
    pulses: 1000,
    lastPulse,
  };
}

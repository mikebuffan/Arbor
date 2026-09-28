import type { AgencyToolContext } from "@/lib/arbor/agency/tools";
import type { ResearchUnitExecutor } from "./sessionRunner";
import type { TrustedResearchHandoff } from "./arkResearchHandoff";
import type { ResearchControllerStore } from "./researchController";
import {
  buildArborResearchControllerPlanner,
} from "./arborResearchControllerPlanner";
import {
  runResearchControllerPulse,
  type ResearchControllerPulseResult,
} from "./researchController";
import {
  decideResearchWake,
  type ResearchWakeDecision,
  type ResearchWakeState,
} from "./researchWakePolicy";

export type ResearchReinsIteration = {
  pulse: ResearchControllerPulseResult;
  wake: ResearchWakeDecision;
};

/**
 * Provider-neutral single "reins" iteration.
 *
 * This is the entire durable handoff seam a wake provider needs:
 * same canonical Arbor planner -> bounded controller pulse -> wake decision.
 * It performs no sleeping/scheduling itself and therefore works identically
 * under tests, Vercel Workflow, or another future durable wake provider.
 */
export async function runResearchReinsIteration(input: {
  handoff: TrustedResearchHandoff;
  store: ResearchControllerStore;
  executor: ResearchUnitExecutor;
  plannerInstructions: string;
  plannerContext: AgencyToolContext;
  behaviorRequirements?: string[];
  allowedUnitKinds?: string[];
  wakeState: ResearchWakeState;
  at: string;
  runAgent?: Parameters<
    typeof buildArborResearchControllerPlanner
  >[0]["runAgent"];
}): Promise<ResearchReinsIteration> {
  const planner = buildArborResearchControllerPlanner({
    instructions: input.plannerInstructions,
    context: input.plannerContext,
    behaviorRequirements: input.behaviorRequirements,
    allowedUnitKinds: input.allowedUnitKinds,
    runAgent: input.runAgent,
  });

  const pulse = await runResearchControllerPulse({
    handoff: input.handoff,
    store: input.store,
    executor: input.executor,
    planner,
    at: input.at,
  });

  return {
    pulse,
    wake: decideResearchWake({
      pulse,
      state: input.wakeState,
    }),
  };
}

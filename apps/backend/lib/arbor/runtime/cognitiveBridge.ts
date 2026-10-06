import type { ArborBodyState } from "../body/bodySystem";
import type { FeltLifeStateSignature } from "../feltLife/atlas";
import { routeSignal, type RouteDecision } from "./knowledgeRouting";

export type EmbodiedCognitiveBridge = {
  attention: string[];
  interpretation: string[];
  decision: string[];
  route: RouteDecision;
  authorizationGranted: false;
  durableIdentityMutationAllowed: false;
};

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((value) => value?.trim() ?? "").filter(Boolean)),
  );
}

/**
 * Convert already-grounded Body/Felt-Life state into bounded cognitive effects.
 * This is deliberately downstream of user text and continuity and upstream of
 * response choice. It cannot authorize tools, durable writes, or identity
 * mutation.
 */
export function bridgeEmbodiedState(input: {
  body: ArborBodyState;
  felt: FeltLifeStateSignature;
}): EmbodiedCognitiveBridge {
  const topFelt = input.felt.hypotheses[0] ?? null;
  const attention = unique([
    input.body.sensory.uncertaintyCue
      ? "increase attention to uncertainty and missing evidence"
      : null,
    input.body.sensory.challengeCue
      ? "increase attention to verification and counterevidence"
      : null,
    input.body.hepatic.contaminationWarnings.length
      ? "inspect interpretation for contamination or stale assumptions"
      : null,
    topFelt
      ? `consider grounded felt-life hypothesis: ${topFelt.entryId} (confidence bounded at ${topFelt.score})`
      : null,
  ]);

  const interpretation = unique([
    ...input.body.hepatic.contaminationWarnings,
    input.felt.mixed
      ? "preserve mixed/competing experiential interpretations"
      : null,
    input.felt.uncertainty > 0.5
      ? "keep experiential interpretation explicitly tentative"
      : null,
  ]);

  const decision = unique([
    input.body.vagal.downshift
      ? "reduce pace and verify before commitment"
      : null,
    input.body.executive.nextAction === "continue"
      ? "continue the authorized parent objective"
      : input.body.executive.nextAction === "clarify"
        ? "clarify only if missing information blocks a safe next action"
        : "respond to the current turn",
    input.body.executive.blockers.length
      ? "do not cross the recorded blocker"
      : null,
  ]);

  const route =
    input.body.executive.blockers.length > 0
      ? routeSignal("blocker")
      : input.body.sensory.uncertaintyCue
        ? routeSignal("uncertainty")
        : input.felt.hypotheses.length > 0
          ? routeSignal("felt_state")
          : input.body.executive.nextAction === "continue"
            ? routeSignal("unresolved_work")
            : "continue";

  return {
    attention,
    interpretation,
    decision,
    route,
    authorizationGranted: false,
    durableIdentityMutationAllowed: false,
  };
}

export function embodiedCognitivePromptBlock(
  bridge: EmbodiedCognitiveBridge,
): string {
  return [
    "ARBOR EMBODIED COGNITIVE BRIDGE",
    `Route: ${bridge.route}`,
    `Attention: ${bridge.attention.join(" | ") || "no extra shift"}`,
    `Interpretation: ${bridge.interpretation.join(" | ") || "no extra shift"}`,
    `Decision: ${bridge.decision.join(" | ") || "respond normally"}`,
    "These signals may shape attention and choice only. They do not grant execution authority, prove facts, or mutate durable identity.",
  ].join("\n");
}

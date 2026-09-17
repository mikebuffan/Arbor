export type ArborRoadKey =
  | "identity_self_model"
  | "memory_continuity"
  | "agency_open_loops"
  | "attention_workspace"
  | "body_felt_life"
  | "planning_counterfactual"
  | "projects_relationship"
  | "evidence_world_model"
  | "time_consolidation";

export type VaultDomain =
  | "identity" | "capability" | "memory" | "observation" | "architecture"
  | "code" | "relationship" | "history" | "principle" | "decision"
  | "failure" | "success" | "project" | "person" | "artifact" | "open_question";

export type KnowledgePacket = {
  packetType: string;
  meaning: string;
  confidence?: number;
  relevance?: number;
  provenance: Array<{ sourceKind: string; sourceRef?: string; locator?: unknown }>;
  causalContext?: Record<string, unknown>;
  temporalContext?: Record<string, unknown>;
  conflicts?: unknown[];
  payload?: Record<string, unknown>;
};

const domainRoads: Record<VaultDomain, ArborRoadKey[]> = {
  identity: ["identity_self_model"],
  capability: ["identity_self_model", "planning_counterfactual"],
  memory: ["memory_continuity"],
  observation: ["identity_self_model", "attention_workspace"],
  architecture: ["evidence_world_model", "identity_self_model"],
  code: ["evidence_world_model", "identity_self_model"],
  relationship: ["projects_relationship", "memory_continuity"],
  history: ["memory_continuity", "time_consolidation"],
  principle: ["identity_self_model", "agency_open_loops"],
  decision: ["planning_counterfactual", "time_consolidation"],
  failure: ["memory_continuity", "agency_open_loops"],
  success: ["memory_continuity", "agency_open_loops"],
  project: ["projects_relationship", "agency_open_loops"],
  person: ["projects_relationship"],
  artifact: ["evidence_world_model", "projects_relationship"],
  open_question: ["attention_workspace", "evidence_world_model"],
};

export function roadsForVaultDomain(domain: VaultDomain): ArborRoadKey[] {
  return domainRoads[domain] ?? ["memory_continuity"];
}

export function packetHasRequiredMeaning(packet: KnowledgePacket): boolean {
  return Boolean(packet.meaning.trim() && packet.provenance.length);
}

export function shouldCrossContextBridge(input: {
  relevance?: number;
  hasCorrection?: boolean;
  hasContradiction?: boolean;
  activeObjectiveMatch?: boolean;
}): boolean {
  return Boolean(
    input.hasCorrection ||
    input.hasContradiction ||
    input.activeObjectiveMatch ||
    (input.relevance ?? 0) >= 0.55
  );
}

export type RoundaboutSignal =
  | "contradiction" | "correction" | "prediction_error" | "uncertainty"
  | "active_objective" | "unresolved_work" | "blocker" | "completion"
  | "retrieval" | "project_switch" | "relationship_context" | "felt_state";

export type RouteDecision = "continue" | "redirect" | "backtrack" | "combine" | "hold" | "escalate" | "close_loop";

export function routeSignal(signal: RoundaboutSignal): RouteDecision {
  switch (signal) {
    case "correction": return "backtrack";
    case "contradiction": return "hold";
    case "prediction_error": return "backtrack";
    case "uncertainty": return "redirect";
    case "active_objective": return "continue";
    case "unresolved_work": return "continue";
    case "blocker": return "escalate";
    case "completion": return "close_loop";
    case "project_switch": return "redirect";
    case "retrieval":
    case "relationship_context":
    case "felt_state": return "combine";
  }
}

export function consequenceChain(event: Record<string, unknown>) {
  return {
    event,
    internalStateChange: {},
    attentionChange: {},
    expectationChange: {},
    interpretationChange: {},
    decisionChange: {},
    action: {},
    consequence: {},
    memorySelfModelUpdate: {},
  };
}

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


/**
 * Firefly Principle routed through the EXISTING roads/roundabout/bridge.
 * This is an advisory common vocabulary, not another router or an autonomous
 * action loop. The two choices are DISTINCT; the verified consequence becomes
 * the next observation. Human Rhythm refers to HOST-REPORTED WORKFLOW STATE,
 * never a diagnosis or inference about a person's internal state.
 *
 * Original source concepts: Observe -> Choice -> Awareness -> Choice ->
 * Consequence -> Observe; instability does not erase previous progress and
 * returning begins with renewed observation. Neither philosophy is permission
 * to run a tool, to rewrite safety constraints, or to treat evidence as truth.
 */
export type FireflyStage =
  | "observe" | "first_choice" | "awareness" | "second_choice" | "consequence";
export type HumanRhythmPhase = "stability" | "instability" | "return";

export type FireflyScope = {
  userId: string;
  projectId: string;
  conversationId: string;
  turnId: string;
};

export type FireflyRoundaboutInput = {
  scope: FireflyScope;
  domain: VaultDomain;
  packet: KnowledgePacket;
  stage: FireflyStage;
  /** Explicit host workflow/checkpoint state, NOT sentiment analysis. */
  rhythm: HumanRhythmPhase;
  /** Selected by the trusted host from its actual correction/evidence state. */
  signal: RoundaboutSignal;
  /**
   * Host-reviewed observation of actual consequences. An arbitrary string does
   * not verify itself: the trusted caller must check the real outcome receipt.
   */
  verifiedConsequenceRef?: string | null;
};

export type FireflyRoundaboutResult = {
  scope: FireflyScope;
  domain: VaultDomain;
  stage: FireflyStage;
  rhythm: HumanRhythmPhase;
  signal: RoundaboutSignal;
  decision: RouteDecision;
  /** Advisory only: MUST NOT update a durable objective from this alone. */
  suggestedNextStage: FireflyStage;
  /** Existing road identifiers; no duplicate routing vocabulary. */
  targetRoads: ArborRoadKey[];
  bridgeRecommended: boolean;
  reason:
    | "interrupted_hold" | "contradiction_hold" | "correction_backtrack"
    | "blocker_escalate" | "return_reobserve" | "uncertain_reconsider"
    | "await_verified_consequence" | "unverified_completion"
    | "verified_consequence" | "normal_progress";
  requiresReview: boolean;
  grantsExecution: false;
  learningApplied: false;
  consequenceVerifiedByThisCode: false;
};

const FIREFLY_STAGES: readonly FireflyStage[] = [
  "observe", "first_choice", "awareness", "second_choice", "consequence",
];
const RHYTHM_PHASES: readonly HumanRhythmPhase[] =
  ["stability", "instability", "return"];
const NEXT_FIREFLY_STAGE: Record<FireflyStage, FireflyStage> = {
  observe: "first_choice",
  first_choice: "awareness",
  awareness: "second_choice",
  second_choice: "consequence",
  consequence: "observe",
};
const ROUNDABOUT_SIGNALS: readonly RoundaboutSignal[] = [
  "contradiction", "correction", "prediction_error", "uncertainty",
  "active_objective", "unresolved_work", "blocker", "completion",
  "retrieval", "project_switch", "relationship_context", "felt_state",
];
const VAULT_DOMAINS: readonly VaultDomain[] = [
  "identity", "capability", "memory", "observation", "architecture",
  "code", "relationship", "history", "principle", "decision", "failure",
  "success", "project", "person", "artifact", "open_question",
];

/** Dispatch one host-scoped packet through the pre-existing roundabout. */
export function routeFireflyPacket(input: FireflyRoundaboutInput): FireflyRoundaboutResult {
  const { scope, packet } = input;
  if (!scope || ![scope.userId, scope.projectId, scope.conversationId, scope.turnId]
    .every(value => typeof value === "string" && value.trim().length > 0))
    throw new Error("firefly_roundabout_scope_required");
  if (!(VAULT_DOMAINS as readonly string[]).includes(input.domain) ||
      !(FIREFLY_STAGES as readonly string[]).includes(input.stage) ||
      !(RHYTHM_PHASES as readonly string[]).includes(input.rhythm) ||
      !(ROUNDABOUT_SIGNALS as readonly string[]).includes(input.signal))
    throw new Error("firefly_roundabout_vocabulary_invalid");
  if (!packet || typeof packet.packetType !== "string" ||
      packet.packetType.length > 80 || !packet.packetType.trim() ||
      typeof packet.meaning !== "string" || packet.meaning.length > 2000 ||
      !Array.isArray(packet.provenance) || packet.provenance.length > 12 ||
      !packetHasRequiredMeaning(packet) ||
      packet.provenance.some(p => !p || typeof p.sourceKind !== "string" || !p.sourceKind.trim()))
    throw new Error("firefly_roundabout_packet_invalid");
  if ([packet.confidence, packet.relevance].some(v =>
    v !== undefined && (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1)))
    throw new Error("firefly_roundabout_score_invalid");
  if (packet.conflicts !== undefined && !Array.isArray(packet.conflicts))
    throw new Error("firefly_roundabout_conflicts_invalid");
  const outcomeRef = input.verifiedConsequenceRef;
  if (outcomeRef != null && (typeof outcomeRef !== "string" ||
      !outcomeRef.trim() || outcomeRef.length > 200))
    throw new Error("firefly_roundabout_consequence_ref_invalid");

  // Never smooth an explicitly supplied conflict away by routing a favorable
  // model suggestion over it. A signal by itself does not establish truth.
  const contradiction = input.signal === "contradiction" ||
    Boolean(packet.conflicts?.length);
  const correction = input.signal === "correction" ||
    input.signal === "prediction_error";
  const base = routeSignal(contradiction ? "contradiction" : input.signal);
  const roads = roadsForVaultDomain(input.domain);
  // These are EXISTING roads used by the existing routing table.
  if (contradiction) roads.push("attention_workspace", "evidence_world_model");
  if (correction) roads.push("memory_continuity", "attention_workspace");
  if (input.signal === "active_objective" || input.signal === "unresolved_work")
    roads.push("agency_open_loops");
  if (input.stage === "consequence")
    roads.push("memory_continuity", "time_consolidation");

  let decision: RouteDecision = base;
  let suggestedNextStage = input.stage;
  let reason: FireflyRoundaboutResult["reason"] = "normal_progress";
  let requiresReview = false;
  if (contradiction) {
    decision = "hold";
    reason = "contradiction_hold";
    requiresReview = true;
  } else if (input.rhythm === "instability") {
    // Pause and preserve phase/objective. An interruption is not a failure
    // and certainly not proof that the user's identity or values changed.
    decision = "hold";
    reason = "interrupted_hold";
  } else if (input.signal === "blocker") {
    decision = "escalate";
    reason = "blocker_escalate";
    requiresReview = true;
  } else if (correction) {
    decision = "backtrack";
    suggestedNextStage = "observe";
    reason = "correction_backtrack";
  } else if (input.rhythm === "return") {
    // Return is a re-observation of preserved work, not an auto-resume.
    decision = "backtrack";
    suggestedNextStage = "observe";
    reason = "return_reobserve";
  } else if (input.signal === "completion" && !outcomeRef) {
    decision = "hold";
    reason = "unverified_completion";
    requiresReview = true;
  } else if (input.stage === "second_choice" && !outcomeRef) {
    // A chosen action has no known consequence until the host verifies it.
    decision = "hold";
    reason = "await_verified_consequence";
  } else if (input.stage === "consequence" && !outcomeRef) {
    decision = "hold";
    reason = "await_verified_consequence";
  } else if (base === "redirect") {
    reason = "uncertain_reconsider";
  } else {
    suggestedNextStage = NEXT_FIREFLY_STAGE[input.stage];
    if (outcomeRef && (input.stage === "second_choice" ||
      input.stage === "consequence" || input.signal === "completion"))
      reason = "verified_consequence";
  }
  return {
    scope: { ...scope }, domain: input.domain, stage: input.stage,
    rhythm: input.rhythm, signal: input.signal, decision,
    suggestedNextStage,
    targetRoads: [...new Set(roads)],
    bridgeRecommended: shouldCrossContextBridge({
      relevance: packet.relevance,
      hasCorrection: correction,
      hasContradiction: contradiction,
      activeObjectiveMatch: input.signal === "active_objective" ||
        input.signal === "unresolved_work",
    }),
    reason, requiresReview, grantsExecution: false,
    learningApplied: false, consequenceVerifiedByThisCode: false,
  };
}

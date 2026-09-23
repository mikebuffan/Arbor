/**
 * Isolated cognitive assembly seam. Takes host-scoped evidence and a saved learning
 * snapshot; reuses the EXISTING Pattern Hop scorer, rejection-reroute logic,
 * learned route projector, and pathway feedback. Does not read/write a DB or run
 * a model/tool/worker. Only an independently reviewed outcome may teach it.
 */
import {
  buildPathStep, selectNextHopCandidates,
  type PatternHopPathStep,
} from "../memory/patternHopEngine";
import type { PatternHopEvidence } from "../memory/patternHop";
import { rerankAfterRejection, type RetrievalRerouteState } from "../memory/retrievalReroute";
import {
  projectLearnedPathways, trainVerifiedPathwayExample, ROUTES,
  type LearnedRoute, type PathwayLearningState,
} from "./associativeLearningLab";
import {
  updatePathwayWeights, type NeuralPathway,
} from "./neuralPathwayNetwork";

export type CognitiveScope = { userId: string; projectId: string };
export type ScopedHopEvidence = PatternHopEvidence & CognitiveScope & {
  retrievalScore: number;
  retrievalMethod: string;
  /** Same document family/report is not an independent corroborating source. */
  sourceFamilyId: string;
};
export type ScopedRejection = CognitiveScope & { state: RetrievalRerouteState };
export type CognitiveCycle = {
  scope: CognitiveScope;
  cue: string;
  seed: ScopedHopEvidence;
  candidates: readonly ScopedHopEvidence[];
  learning: PathwayLearningState;
  pathways: readonly NeuralPathway[];
  rejection?: ScopedRejection;
  maxHops?: number;
};
export type CognitiveHop = PatternHopPathStep & {
  source: string;
  sourceFamilyId: string;
  /** Retained as a hypothesis until an independent host-reviewed outcome exists. */
  verifiedLearningOutcome: false;
};
export type CognitiveCycleResult = {
  scope: CognitiveScope;
  cue: string;
  route: LearnedRoute | null;
  routeAbstained: boolean;
  pathwayIds: string[];
  suggestedSystems: string[];
  hops: CognitiveHop[];
  visitedEvidenceIds: string[];
  stopReason: "no_candidates" | "max_hops";
  /** A source family count is descriptive only, not a corroboration score. */
  sourceFamilies: string[];
  grantsExecution: false;
  learningApplied: false;
  independentCorroborationVerified: false;
};
export type IndependentOutcomeReceipt = CognitiveScope & {
  id: string;
  at: string;
  pathwayId: string;
  outcome: "verified_helpful" | "verified_unhelpful";
  /** Externally reviewed route label; no inference from hop score or frequency. */
  reviewedRoute: LearnedRoute;
};
export type CognitiveLearningLedger = {
  scope: CognitiveScope;
  receipts: Record<string, string>;
};
export type CognitiveLearningResult = {
  learning: PathwayLearningState;
  pathways: NeuralPathway[];
  ledger: CognitiveLearningLedger;
  changed: boolean;
  grantsExecution: false;
};

function assertScope(a: CognitiveScope, b: CognitiveScope): void {
  if (!a.userId.trim() || !a.projectId.trim() ||
    a.userId !== b.userId || a.projectId !== b.projectId)
    throw new Error("cognitive_scope_mismatch");
}
function validateEvidence(item: ScopedHopEvidence): void {
  if (!item.id?.trim() || !item.source?.trim() || !item.sourceFamilyId?.trim() ||
    !item.content?.trim() || item.content.length > 2000 ||
    !item.retrievalMethod?.trim() || !Number.isFinite(item.retrievalScore) ||
    item.retrievalScore < 0 || item.retrievalScore > 1 ||
    !Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1)
    throw new Error("cognitive_evidence_invalid");
  if (!["direct", "derived", "hypothesis", "retrospective", "contradictory"].includes(item.epistemicStatus))
    throw new Error("cognitive_epistemic_status_invalid");
}

/** One bounded serial hop trace (not recursive autonomous research). */
export function assembleCognitiveCycle(input: CognitiveCycle): CognitiveCycleResult {
  assertScope(input.scope, input.learning);
  const pathwayIds = new Set<string>();
  for (const path of input.pathways) {
    assertScope(input.scope, path);
    if (!path.id.trim() || pathwayIds.has(path.id)) throw new Error("cognitive_duplicate_pathway_id");
    pathwayIds.add(path.id);
  }
  if (input.rejection) assertScope(input.scope, input.rejection);
  if (!input.cue.trim() || input.cue.length > 2000) throw new Error("cognitive_cue_invalid");
  const maxHops = input.maxHops ?? 3;
  if (!Number.isInteger(maxHops) || maxHops < 1 || maxHops > 4)
    throw new Error("cognitive_hop_limit_invalid");
  if (input.candidates.length > 32) throw new Error("cognitive_candidate_limit");
  const ids = new Set<string>();
  for (const item of [input.seed, ...input.candidates]) {
    assertScope(input.scope, item);
    validateEvidence(item);
    if (ids.has(item.id)) throw new Error("cognitive_duplicate_evidence_id");
    ids.add(item.id);
  }
  const activation = projectLearnedPathways(input.learning, {
    ...input.scope, text: input.cue, pathways: input.pathways,
  });
  const reranked = input.rejection
    ? rerankAfterRejection({
      currentCue: input.cue, state: input.rejection.state,
      candidates: input.candidates.map(item => ({
        key: item.id, text: item.content, score: item.retrievalScore,
      })),
    })
    : input.candidates.map(item => ({ key: item.id, score: item.retrievalScore }));
  const scores = new Map(reranked.map(item => [item.key, Math.max(0, Math.min(1, item.score))]));
  const visited = new Set([input.seed.id]);
  const hops: CognitiveHop[] = [];
  let parent: ScopedHopEvidence = input.seed;
  for (let depth = 1; depth <= maxHops; depth++) {
    const selected = selectNextHopCandidates({
      parent,
      candidates: input.candidates.filter(item => !visited.has(item.id)).map(item => ({
        evidence: item,
        retrievalScore: scores.get(item.id) ?? 0,
        retrievalMethod: item.retrievalMethod,
      })),
      visitedEvidenceIds: visited,
      branchLimit: 1,
      minScore: 0.42,
    });
    if (!selected.length) break;
    const winner = selected[0];
    const evidence = input.candidates.find(item => item.id === winner.evidence.id);
    if (!evidence) throw new Error("cognitive_evidence_missing");
    const pathStep = buildPathStep({ candidate: winner, parentEvidenceId: parent.id, depth });
    hops.push({ ...pathStep, source: evidence.source,
      sourceFamilyId: evidence.sourceFamilyId, verifiedLearningOutcome: false });
    visited.add(evidence.id);
    parent = evidence;
  }
  return {
    scope: { ...input.scope }, cue: input.cue,
    route: activation.prediction.route,
    routeAbstained: activation.prediction.abstained,
    pathwayIds: [...activation.pathwayIds],
    suggestedSystems: [...activation.suggestedSystems],
    hops,
    visitedEvidenceIds: [...visited],
    stopReason: hops.length === maxHops ? "max_hops" : "no_candidates",
    sourceFamilies: [...new Set([input.seed.sourceFamilyId, ...hops.map(h => h.sourceFamilyId)])],
    grantsExecution: false,
    learningApplied: false,
    independentCorroborationVerified: false,
  };
}

/**
 * ONLY for an independently host-reviewed outcome. A hop or user-supplied string
 * is NOT the review receipt. Caller must authenticate, scope and verify the
 * outcome before invoking this pure function, then persist snapshots atomically.
 */
export function applyReviewedCognitiveOutcome(input: {
  cycle: CognitiveCycleResult;
  learning: PathwayLearningState;
  pathways: readonly NeuralPathway[];
  ledger: CognitiveLearningLedger;
  receipt: IndependentOutcomeReceipt;
}): CognitiveLearningResult {
  const { cycle, receipt, learning, ledger } = input;
  assertScope(cycle.scope, receipt);
  assertScope(cycle.scope, learning);
  assertScope(cycle.scope, ledger.scope);
  if (!receipt.id.trim() || !Number.isFinite(Date.parse(receipt.at)) ||
    !(["verified_helpful", "verified_unhelpful"] as string[]).includes(receipt.outcome) ||
    !(ROUTES as readonly string[]).includes(receipt.reviewedRoute))
    throw new Error("cognitive_receipt_invalid");
  if (!cycle.pathwayIds.includes(receipt.pathwayId))
    throw new Error("cognitive_pathway_not_selected");
  if (!input.pathways.some(path => path.id === receipt.pathwayId))
    throw new Error("cognitive_pathway_not_found");
  for (const path of input.pathways) assertScope(cycle.scope, path);
  if (cycle.route && receipt.reviewedRoute !== cycle.route && receipt.outcome === "verified_helpful")
    throw new Error("cognitive_review_disagrees_with_route");
  const payload = JSON.stringify([cycle.cue, receipt.pathwayId,
    receipt.outcome, receipt.reviewedRoute, receipt.at]);
  if (Object.prototype.hasOwnProperty.call(ledger.receipts, receipt.id)) {
    if (ledger.receipts[receipt.id] !== payload) throw new Error("cognitive_receipt_conflict");
    return { learning, pathways: [...input.pathways], ledger, changed: false, grantsExecution: false };
  }
  // A partially persisted update must be reconciled by the host, not trained again.
  if (input.pathways.some(path => path.evidenceRefs.includes(receipt.id)) ||
    Object.prototype.hasOwnProperty.call(learning.receipts, receipt.id))
    throw new Error("cognitive_receipt_reconciliation_required");
  // The reviewed OUTCOME, never the exploratory hop, changes weights.
  const pathways = updatePathwayWeights(input.pathways, {
    pathwayId: receipt.pathwayId, ...cycle.scope,
    evidenceRef: receipt.id, at: receipt.at, outcome: receipt.outcome,
  });
  const nextLearning = receipt.outcome === "verified_helpful"
    ? trainVerifiedPathwayExample(learning, {
      ...cycle.scope, text: cycle.cue,
      route: receipt.reviewedRoute, verifiedReceipt: receipt.id,
    })
    : learning;
  return {
    learning: nextLearning, pathways,
    ledger: { scope: { ...cycle.scope },
      receipts: { ...ledger.receipts, [receipt.id]: payload } },
    changed: true, grantsExecution: false,
  };
}
/**
 * Host-facing, project-scoped cognitive snapshot port.
 *
 * This is intentionally NOT a Supabase implementation, an auth provider, or
 * an enabled Grove route. An authenticated host must verify owner, project,
 * and conversation BEFORE any call here. The host's compareAndSwap MUST be
 * a single atomic transaction scoped to the owner and project; read+write
 * without a revision predicate is not an acceptable implementation.
 *
 * A project's learning survives individual conversations; the active goal,
 * current channel and conversation records stay in ARK/continuity, not here.
 */
import type { ArborContinuityState } from "../arbor/continuity/state";
import type { ArborInteractionMode } from "../arbor/behavior/behaviorProjection";
import type { ArborSubsystem } from "../arbor/runtime/arborRuntime";
import { previewCognitiveBodyCycle } from "./cognitiveBodyPreview";
import {
  applyReviewedCognitiveOutcome,
  type CognitiveCycleResult,
  type CognitiveLearningLedger,
  type CognitiveScope,
  type IndependentOutcomeReceipt,
  type ScopedHopEvidence,
  type ScopedRejection,
} from "./cognitiveAssembly";
import type { PathwayLearningState } from "./associativeLearningLab";
import type { NeuralPathway } from "./neuralPathwayNetwork";

export type CognitiveHostTurn = CognitiveScope & {
  /** Already verified by the caller against the current authenticated user. */
  conversationId: string;
  turnId: string;
};
export type ScopedContinuityForTurn = {
  userId: string;
  projectId: string;
  conversationId: string;
  state: ArborContinuityState;
};
export type CognitiveProjectSnapshot = {
  schemaVersion: 1;
  scope: CognitiveScope;
  revision: number;
  learning: PathwayLearningState;
  pathways: NeuralPathway[];
  ledger: CognitiveLearningLedger;
  lastReviewedAt: string | null;
};
export type CognitiveSnapshotPort = {
  /** A host-scoped read, NEVER a client-chosen project or role. */
  read(scope: CognitiveScope): Promise<CognitiveProjectSnapshot | null>;
  /** Must commit the ENTIRE snapshot atomically only if revision still matches. */
  compareAndSwap(input: {
    scope: CognitiveScope;
    expectedRevision: number;
    next: CognitiveProjectSnapshot;
  }): Promise<boolean>;
};
export type CognitivePreparedTurn = {
  host: CognitiveHostTurn;
  snapshotRevision: number;
  cycle: CognitiveCycleResult;
  nextActionHint: "respond" | "continue" | "clarify";
  activeGoal: string | null;
  unresolvedWork: string[];
  bodyWarnings: string[];
  /** A preview is NOT an ARK checkpoint or successful tool execution. */
  grantsExecution: false;
  liveWorkVerified: false;
};
export type CognitivePreviewResult =
  | { status: "off" | "not_provisioned"; grantsExecution: false }
  | { status: "ready"; prepared: CognitivePreparedTurn; grantsExecution: false };
export type CognitiveCommitResult = {
  changed: boolean;
  revision: number;
  learningUpdateCount: number;
  grantsExecution: false;
  liveWorkVerified: false;
};

function assertScope(expected: CognitiveScope, actual: CognitiveScope): void {
  if (!expected.userId.trim() || !expected.projectId.trim() ||
      expected.userId !== actual.userId || expected.projectId !== actual.projectId)
    throw new Error("cognitive_session_scope_mismatch");
}
function assertHost(host: CognitiveHostTurn): void {
  assertScope(host, host);
  if (!host.conversationId?.trim() || !host.turnId?.trim())
    throw new Error("cognitive_session_turn_required");
}
function assertSnapshot(scope: CognitiveScope, snapshot: CognitiveProjectSnapshot): void {
  assertScope(scope, snapshot.scope);
  assertScope(scope, snapshot.learning);
  assertScope(scope, snapshot.ledger.scope);
  if (snapshot.schemaVersion !== 1 || !Number.isSafeInteger(snapshot.revision) ||
      snapshot.revision < 0 || (snapshot.lastReviewedAt !== null &&
      !Number.isFinite(Date.parse(snapshot.lastReviewedAt))))
    throw new Error("cognitive_session_snapshot_invalid");
  const ids = new Set<string>();
  for (const pathway of snapshot.pathways) {
    assertScope(scope, pathway);
    if (!pathway.id.trim() || ids.has(pathway.id))
      throw new Error("cognitive_session_duplicate_pathway");
    ids.add(pathway.id);
  }
}
/** Seeded only from the host's approved blank state + reviewed initial pathways. */
export function createCognitiveProjectSnapshot(input: {
  scope: CognitiveScope;
  learning: PathwayLearningState;
  pathways: readonly NeuralPathway[];
  ledger: CognitiveLearningLedger;
}): CognitiveProjectSnapshot {
  const snapshot: CognitiveProjectSnapshot = {
    schemaVersion: 1, scope: { ...input.scope }, revision: 0,
    learning: input.learning, pathways: [...input.pathways], ledger: input.ledger,
    lastReviewedAt: null,
  };
  assertSnapshot(input.scope, snapshot);
  return snapshot;
}
/**
 * Reads existing project-level learning, and builds one turn using only the
 * CURRENT host-verified conversation's continuity. Feature OFF is a hard no-op.
 * Nothing is persisted merely because Pattern Hop found a correlation.
 */
export async function previewPersistedCognitiveTurn(input: {
  enabled: boolean;
  host: CognitiveHostTurn;
  store: CognitiveSnapshotPort;
  cue: string;
  seed: ScopedHopEvidence;
  candidates: readonly ScopedHopEvidence[];
  mode: ArborInteractionMode;
  activeSubsystem: ArborSubsystem;
  continuity?: ScopedContinuityForTurn | null;
  rejection?: ScopedRejection;
  maxHops?: number;
}): Promise<CognitivePreviewResult> {
  if (!input.enabled) return { status: "off", grantsExecution: false };
  assertHost(input.host);
  if (input.continuity) {
    assertScope(input.host, input.continuity);
    if (input.continuity.conversationId !== input.host.conversationId)
      throw new Error("cognitive_session_conversation_mismatch");
  }
  const snapshot = await input.store.read(input.host);
  if (!snapshot) return { status: "not_provisioned", grantsExecution: false };
  assertSnapshot(input.host, snapshot);
  const view = previewCognitiveBodyCycle({
    scope: input.host, cue: input.cue, seed: input.seed,
    candidates: input.candidates, learning: snapshot.learning,
    pathways: snapshot.pathways, rejection: input.rejection,
    maxHops: input.maxHops,
    bodyContext: { mode: input.mode, activeSubsystem: input.activeSubsystem,
      continuity: input.continuity?.state },
  });
  const prepared: CognitivePreparedTurn = {
    host: { ...input.host }, snapshotRevision: snapshot.revision,
    cycle: view.cycle, nextActionHint: view.nextActionHint,
    activeGoal: input.continuity?.state.currentGoal ?? null,
    unresolvedWork: [...(input.continuity?.state.unresolvedWork ?? [])],
    bodyWarnings: view.bodyWarnings, grantsExecution: false,
    liveWorkVerified: false,
  };
  return { status: "ready", prepared, grantsExecution: false };
}

/**
 * Only a host-authenticated and externally verified result may write learning.
 * `confirmReview` MUST check the receipt against a real outcome/turn, not just
 * trust its text, signature-looking ID or the exploration score. Its success is
 * a precondition; it cannot turn speculative hops into independent sources.
 */
export async function commitReviewedCognitiveTurn(input: {
  enabled: boolean;
  host: CognitiveHostTurn;
  prepared: CognitivePreparedTurn;
  receipt: IndependentOutcomeReceipt;
  store: CognitiveSnapshotPort;
  confirmReview: (context: {
    host: CognitiveHostTurn;
    cycle: CognitiveCycleResult;
    receipt: IndependentOutcomeReceipt;
  }) => Promise<boolean>;
}): Promise<CognitiveCommitResult> {
  if (!input.enabled) throw new Error("cognitive_session_feature_off");
  assertHost(input.host);
  assertScope(input.host, input.prepared.host);
  assertScope(input.host, input.prepared.cycle.scope);
  assertScope(input.host, input.receipt);
  if (input.prepared.host.conversationId !== input.host.conversationId ||
      input.prepared.host.turnId !== input.host.turnId)
    throw new Error("cognitive_session_turn_mismatch");
  if (!await input.confirmReview({ host: input.host, cycle: input.prepared.cycle, receipt: input.receipt }))
    throw new Error("cognitive_session_review_unverified");
  const current = await input.store.read(input.host);
  if (!current) throw new Error("cognitive_session_not_provisioned");
  assertSnapshot(input.host, current);
  // Repeated delivery of an already committed receipt is read-only even after
  // later decisions changed the path status or revision.
  const prior = Object.prototype.hasOwnProperty.call(current.ledger.receipts, input.receipt.id)
    ? current.ledger.receipts[input.receipt.id] : undefined;
  if (prior !== undefined) {
    const expected = JSON.stringify([input.prepared.cycle.cue, input.receipt.pathwayId,
      input.receipt.outcome, input.receipt.reviewedRoute, input.receipt.at]);
    if (prior !== expected) throw new Error("cognitive_session_receipt_conflict");
    return { changed: false, revision: current.revision,
      learningUpdateCount: current.learning.updateCount,
      grantsExecution: false, liveWorkVerified: false };
  }
  if (current.revision !== input.prepared.snapshotRevision)
    throw new Error("cognitive_session_revision_conflict");
  const reviewed = applyReviewedCognitiveOutcome({
    cycle: input.prepared.cycle, learning: current.learning,
    pathways: current.pathways, ledger: current.ledger,
    receipt: input.receipt,
  });
  if (!reviewed.changed) throw new Error("cognitive_session_inconsistent_ledger");
  const next: CognitiveProjectSnapshot = {
    ...current, revision: current.revision + 1,
    learning: reviewed.learning, pathways: reviewed.pathways,
    ledger: reviewed.ledger, lastReviewedAt: input.receipt.at,
  };
  assertSnapshot(input.host, next);
  const committed = await input.store.compareAndSwap({
    scope: input.host, expectedRevision: current.revision, next,
  });
  if (!committed) throw new Error("cognitive_session_concurrent_review");
  return { changed: true, revision: next.revision,
    learningUpdateCount: next.learning.updateCount,
    grantsExecution: false, liveWorkVerified: false };
}
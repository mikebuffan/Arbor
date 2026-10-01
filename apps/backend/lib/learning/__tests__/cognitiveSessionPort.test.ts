import { describe, expect, it } from "vitest";
import {
  commitReviewedCognitiveTurn, createCognitiveProjectSnapshot,
  previewPersistedCognitiveTurn,
  type CognitiveProjectSnapshot, type CognitiveSnapshotPort,
  type CognitivePreparedTurn,
} from "../cognitiveSessionPort";
import { newPathwayLearningState, predictLearnedRoute } from "../associativeLearningLab";
import { runAssociativeLearningBenchmark } from "../associativeLearningBenchmark";
import type { NeuralPathway } from "../neuralPathwayNetwork";
import type { ScopedHopEvidence, IndependentOutcomeReceipt } from "../cognitiveAssembly";
import type { ArborContinuityState } from "../../arbor/continuity/state";

const scope = { userId: "synthetic-owner", projectId: "synthetic-project" };
const host = { ...scope, conversationId: "conversation-a", turnId: "turn-1" };
const at = "2026-09-23T12:00:00.000Z";
const pathway: NeuralPathway = {
  ...scope, id: "route-objective", cues: ["route:objective"],
  associatedSystems: ["executive", "memory"], type: "association",
  action: "suggest_context", status: "active", strength: 0.5,
  evidenceRefs: ["initial:synthetic"], lastReinforcedAt: at, protected: false,
};
const learning = { ...runAssociativeLearningBenchmark().state, ...scope };
const fresh = () => createCognitiveProjectSnapshot({
  scope, learning, pathways: [pathway], ledger: { scope, receipts: {} },
});
const ev = (id: string): ScopedHopEvidence => ({
  ...scope, id, source: `source:${id}`, sourceFamilyId: `family:${id}`,
  evidenceType: "fixture", content: "agency continuity correction", confidence: 0.9,
  epistemicStatus: "direct", retrievalScore: 0.9, retrievalMethod: "synthetic",
});
const continuity = (goal: string): ArborContinuityState => ({
  currentGoal: goal, unresolvedWork: ["Continue work"],
  lastMeaningfulUserTurn: null, lastMeaningfulArborTurn: null,
  recurringWeaknesses: [], retainedStrategies: [], activeCorrections: [],
  activeSubsystem: "arbor", channel: "text",
});
const previewArgs = (store: CognitiveSnapshotPort, overrides: Record<string, unknown> = {}) => ({
  enabled: true, host, store, cue: "Keep going to the next task",
  seed: ev("seed"), candidates: [ev("candidate")],
  mode: "text" as const, activeSubsystem: "arbor" as const,
  continuity: { ...host, state: continuity("Finish the experiment") },
  ...overrides,
});
const outcome = (overrides: Partial<IndependentOutcomeReceipt> = {}): IndependentOutcomeReceipt => ({
  ...scope, id: "synthetic-reviewed:1", at, pathwayId: pathway.id,
  outcome: "verified_helpful", reviewedRoute: "objective", ...overrides,
});
class DisposableSnapshotPort implements CognitiveSnapshotPort {
  value: CognitiveProjectSnapshot | null;
  reads = 0;
  commits = 0;
  rejectNextCommit = false;
  constructor(initial: CognitiveProjectSnapshot | null = fresh()) {
    this.value = initial === null ? null : structuredClone(initial);
  }
  async read(project: typeof scope) {
    this.reads++;
    if (project.userId !== scope.userId || project.projectId !== scope.projectId)
      throw new Error("synthetic_ownership_denied");
    return this.value === null ? null : structuredClone(this.value);
  }
  async compareAndSwap(input: { scope: typeof scope; expectedRevision: number; next: CognitiveProjectSnapshot }) {
    if (input.scope.userId !== scope.userId || input.scope.projectId !== scope.projectId)
      throw new Error("synthetic_ownership_denied");
    if (this.rejectNextCommit) { this.rejectNextCommit = false; return false; }
    if (this.value?.revision !== input.expectedRevision) return false;
    this.value = structuredClone(input.next);
    this.commits++;
    return true;
  }
}
async function prepared(store: CognitiveSnapshotPort, overrides: Record<string, unknown> = {}): Promise<CognitivePreparedTurn> {
  const result = await previewPersistedCognitiveTurn(previewArgs(store, overrides));
  if (result.status !== "ready") throw new Error("synthetic_preview_not_ready");
  return result.prepared;
}
const review = (store: CognitiveSnapshotPort, turn: CognitivePreparedTurn,
  receipt: IndependentOutcomeReceipt = outcome(),
  verified = true) => commitReviewedCognitiveTurn({
    enabled: true, host: turn.host, prepared: turn, receipt, store,
    confirmReview: async () => verified,
  });

describe("Cognitive project snapshot/agency handoff — synthetic only, feature OFF in product", () => {
  it("feature OFF never even reads, and an unprovisioned store does not invent learning", async () => {
    const db = new DisposableSnapshotPort(null);
    const off = await previewPersistedCognitiveTurn(previewArgs(db, { enabled: false }));
    expect(off.status).toBe("off");
    expect(db.reads).toBe(0);
    const missing = await previewPersistedCognitiveTurn(previewArgs(db));
    expect(missing.status).toBe("not_provisioned");
    expect(db.commits).toBe(0);
  });
  it("preview reads real previously saved learning and the existing body without writing", async () => {
    const db = new DisposableSnapshotPort();
    const turn = await prepared(db);
    expect(turn.snapshotRevision).toBe(0);
    expect(turn.cycle.route).toBe("objective");
    expect(turn.cycle.suggestedSystems).toContain("executive");
    expect(turn.cycle.hops).toHaveLength(1);
    expect(turn.nextActionHint).toBe("continue");
    expect(turn.activeGoal).toBe("Finish the experiment");
    expect(turn.liveWorkVerified).toBe(false);
    expect(turn.grantsExecution).toBe(false);
    expect(db.commits).toBe(0);
  });
  it("rejects foreign continuity even within the same project and foreign snapshot", async () => {
    const db = new DisposableSnapshotPort();
    await expect(previewPersistedCognitiveTurn(previewArgs(db, {
      continuity: { ...host, conversationId: "other-conversation", state: continuity("private goal") },
    }))).rejects.toThrow("cognitive_session_conversation_mismatch");
    await expect(previewPersistedCognitiveTurn(previewArgs(db, {
      continuity: { ...host, projectId: "foreign", state: continuity("private goal") },
    }))).rejects.toThrow("cognitive_session_scope_mismatch");
    db.value = { ...fresh(), scope: { ...scope, userId: "foreign" } };
    await expect(previewPersistedCognitiveTurn(previewArgs(db)))
      .rejects.toThrow("cognitive_session_scope_mismatch");
  });
  it("unreviewed result and feature OFF do not write the project snapshot", async () => {
    const db = new DisposableSnapshotPort();
    const turn = await prepared(db);
    await expect(review(db, turn, outcome(), false))
      .rejects.toThrow("cognitive_session_review_unverified");
    await expect(commitReviewedCognitiveTurn({ enabled: false,
      host, prepared: turn, receipt: outcome(), store: db,
      confirmReview: async () => true,
    })).rejects.toThrow("cognitive_session_feature_off");
    expect(db.commits).toBe(0);
    expect(db.value?.revision).toBe(0);
  });
  it("verified success is atomic, restartable, and duplicate receipts never teach twice", async () => {
    const db = new DisposableSnapshotPort();
    const turn = await prepared(db);
    const first = await review(db, turn);
    expect(first.changed).toBe(true);
    expect(first.revision).toBe(1);
    expect(first.learningUpdateCount).toBe(25);
    expect(db.commits).toBe(1);
    // Simulate a new host process loading JSON from the same persisted project.
    const afterRestart = new DisposableSnapshotPort(structuredClone(db.value));
    const replay = await review(afterRestart, turn);
    expect(replay.changed).toBe(false);
    expect(replay.revision).toBe(1);
    expect(replay.learningUpdateCount).toBe(25);
    expect(afterRestart.commits).toBe(0);
    expect(afterRestart.value?.pathways[0].strength).toBeCloseTo(0.6);
    await expect(review(afterRestart, turn, outcome({ reviewedRoute: "identity" })))
      .rejects.toThrow("cognitive_session_receipt_conflict");
  });
  it("a verified correction changes the NEXT prediction, without learning from the hop", async () => {
    const db = new DisposableSnapshotPort();
    const initial = await prepared(db);
    const original = predictLearnedRoute(db.value!.learning, { ...scope, text: initial.cycle.cue });
    const result = await review(db, initial,
      outcome({ outcome: "verified_unhelpful", reviewedRoute: "identity" }));
    expect(result.revision).toBe(1);
    expect(db.value!.pathways[0].strength).toBeCloseTo(0.34);
    expect(db.value!.learning.updateCount).toBe(25);
    const anotherConversation = { ...host, conversationId: "conversation-b", turnId: "turn-2" };
    const second = await prepared(db, {
      host: anotherConversation,
      continuity: { ...anotherConversation, state: continuity("Different current goal") },
    });
    const learnedNow = predictLearnedRoute(db.value!.learning, { ...scope, text: second.cycle.cue });
    expect(learnedNow.probabilities.identity).toBeGreaterThan(original.probabilities.identity);
    expect(second.snapshotRevision).toBe(1);
    expect(second.activeGoal).toBe("Different current goal");
    expect(second.host.conversationId).toBe("conversation-b");
    expect(second.cycle.learningApplied).toBe(false);
  });
  it("stale second review cannot overwrite concurrent learning or roll back corrections", async () => {
    const db = new DisposableSnapshotPort();
    const turn = await prepared(db);
    await review(db, turn);
    const stored = structuredClone(db.value);
    await expect(review(db, turn, outcome({ id: "synthetic-reviewed:2" })))
      .rejects.toThrow("cognitive_session_revision_conflict");
    expect(db.value).toEqual(stored);
    expect(db.commits).toBe(1);
  });
  it("failed compare-and-swap cannot partially write pathway, weights, or receipt", async () => {
    const db = new DisposableSnapshotPort();
    const turn = await prepared(db);
    const old = structuredClone(db.value);
    db.rejectNextCommit = true;
    await expect(review(db, turn)).rejects.toThrow("cognitive_session_concurrent_review");
    expect(db.value).toEqual(old);
    expect(db.commits).toBe(0);
    const later = await review(db, turn);
    expect(later.changed).toBe(true);
    expect(db.commits).toBe(1);
  });
  it("feedback cannot be replayed under another conversation or user", async () => {
    const db = new DisposableSnapshotPort();
    const turn = await prepared(db);
    await expect(commitReviewedCognitiveTurn({ enabled: true,
      host: { ...host, conversationId: "foreign" }, prepared: turn,
      receipt: outcome(), store: db, confirmReview: async () => true,
    })).rejects.toThrow("cognitive_session_turn_mismatch");
    await expect(commitReviewedCognitiveTurn({ enabled: true,
      host, prepared: turn, receipt: outcome({ userId: "other" }),
      store: db, confirmReview: async () => true,
    })).rejects.toThrow("cognitive_session_scope_mismatch");
    expect(db.commits).toBe(0);
  });
  it("a pathway placed on HOLD after the initial read cannot silently reactivate", async () => {
    const db = new DisposableSnapshotPort();
    const turn = await prepared(db);
    db.value = { ...fresh(), pathways: [{ ...pathway, status: "suppressed" }] };
    await expect(review(db, turn)).rejects.toThrow("cognitive_pathway_no_longer_active");
    expect(db.commits).toBe(0);
  });
  it("snapshot validator refuses a corrupt revision or duplicate pathway ID", async () => {
    const db = new DisposableSnapshotPort();
    db.value = { ...fresh(), revision: -1 };
    await expect(previewPersistedCognitiveTurn(previewArgs(db)))
      .rejects.toThrow("cognitive_session_snapshot_invalid");
    db.value = { ...fresh(), pathways: [pathway, pathway] };
    await expect(previewPersistedCognitiveTurn(previewArgs(db)))
      .rejects.toThrow("cognitive_session_duplicate_pathway");
    expect(db.commits).toBe(0);
  });
  it("a blank learned model remains abstained without guessing the user’s next action", async () => {
    const db = new DisposableSnapshotPort(createCognitiveProjectSnapshot({
      scope, learning: newPathwayLearningState(scope.userId, scope.projectId),
      pathways: [pathway], ledger: { scope, receipts: {} },
    }));
    const turn = await prepared(db);
    expect(turn.cycle.route).toBeNull();
    expect(turn.cycle.pathwayIds).toEqual([]);
    expect(turn.nextActionHint).toBe("continue");
    expect(turn.grantsExecution).toBe(false);
    expect(db.commits).toBe(0);
  });
});
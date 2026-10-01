import { describe, expect, it } from "vitest";
import { previewFireflyCognitiveRoundabout } from "../fireflyCognitiveRoundabout";
import {
  createCognitiveProjectSnapshot, type CognitiveSnapshotPort,
} from "../cognitiveSessionPort";
import { runAssociativeLearningBenchmark } from "../associativeLearningBenchmark";
import type { NeuralPathway } from "../neuralPathwayNetwork";
import type { ScopedHopEvidence } from "../cognitiveAssembly";

const scope = { userId: "synthetic-owner", projectId: "synthetic-project" };
const host = { ...scope, conversationId: "conversation-A", turnId: "turn-1" };
const path: NeuralPathway = {
  ...scope, id: "active-path", cues: ["route:objective"],
  associatedSystems: ["executive", "memory"], type: "association",
  action: "suggest_context", status: "active", strength: 0.5,
  evidenceRefs: ["synthetic-seed"], lastReinforcedAt: "2026-09-23T00:00:00Z",
  protected: false,
};
const initial = createCognitiveProjectSnapshot({
  scope, learning: { ...runAssociativeLearningBenchmark().state, ...scope },
  pathways: [path], ledger: { scope, receipts: {} },
});
const seed: ScopedHopEvidence = {
  ...scope, id: "seed", source: "synthetic-seed-source",
  sourceFamilyId: "synthetic-family-1", evidenceType: "synthetic",
  content: "agency continuity correction", confidence: 0.9,
  epistemicStatus: "direct", retrievalScore: 0.9,
  retrievalMethod: "synthetic",
};
const candidate: ScopedHopEvidence = {
  ...seed, id: "candidate", source: "synthetic-candidate-source",
  sourceFamilyId: "synthetic-family-2",
  content: "agency continuity correction backend implementation",
};
function store(): CognitiveSnapshotPort & { writes: number; reads: number } {
  return {
    writes: 0, reads: 0,
    async read() { this.reads++; return structuredClone(initial); },
    async compareAndSwap() { this.writes++; throw new Error("never_write_preview"); },
  };
}
const continuity = {
  ...host, state: {
    currentGoal: "Finish Grove", unresolvedWork: ["Verify host integration"],
    lastMeaningfulUserTurn: null, lastMeaningfulArborTurn: null,
    recurringWeaknesses: [], retainedStrategies: [], activeCorrections: [],
    activeSubsystem: "arbor" as const, channel: "text" as const,
  },
};
const args = (db: CognitiveSnapshotPort, overrides: Record<string, unknown> = {}) => ({
  enabled: true, host, store: db,
  cue: "Keep going to the next task", seed,
  candidates: [candidate], mode: "text" as const,
  activeSubsystem: "arbor" as const, continuity,
  domain: "memory" as const, stage: "observe" as const,
  rhythm: "stability" as const, signal: "active_objective" as const,
  ...overrides,
});
function ready<T extends { status: string }>(result: T): Extract<T, { status: "ready" }> {
  if (result.status !== "ready") throw new Error("expected_cognitive_ready");
  return result as Extract<T, { status: "ready" }>;
}

describe("Firefly roundabout -> existing cognitive brain -> private-model data", () => {
  it("reuses persisted learning and existing roads; does not execute or persist", async () => {
    const db = store();
    const view = ready(await previewFireflyCognitiveRoundabout(args(db)));
    expect(db.reads).toBe(1);
    expect(db.writes).toBe(0);
    expect(view.prepared.activeGoal).toBe("Finish Grove");
    expect(view.prepared.cycle.route).toBe("objective");
    expect(view.roundabout.stage).toBe("observe");
    expect(view.roundabout.suggestedNextStage).toBe("first_choice");
    expect(view.roundabout.bridgeRecommended).toBe(true);
    expect(view.roundabout.targetRoads).toContain("memory_continuity");
    expect(view.roundabout.targetRoads).toContain("agency_open_loops");
    expect(view.privateModelData).toBeNull();
    expect(view.grantsExecution).toBe(false);
    expect(view.learningApplied).toBe(false);
  });
  it("feature OFF and missing project learning do not pretend to have a brain", async () => {
    const db = store();
    const disabled = await previewFireflyCognitiveRoundabout(args(db, { enabled: false }));
    expect(disabled.status).toBe("off");
    expect(db.reads).toBe(0);
    const missing: CognitiveSnapshotPort = {
      read: async () => null,
      compareAndSwap: async () => { throw new Error("never"); },
    };
    expect((await previewFireflyCognitiveRoundabout(args(missing))).status)
      .toBe("not_provisioned");
  });
  it("makes contradiction HOLD win over a favorable objective route", async () => {
    const view = ready(await previewFireflyCognitiveRoundabout(args(store(), {
      signal: "contradiction", stage: "awareness",
    })));
    expect(view.prepared.cycle.route).toBe("objective");
    expect(view.roundabout.decision).toBe("hold");
    expect(view.roundabout.suggestedNextStage).toBe("awareness");
    expect(view.roundabout.requiresReview).toBe(true);
  });
  it("preserves objective while interrupted and returns by re-observing", async () => {
    const db = store();
    const paused = ready(await previewFireflyCognitiveRoundabout(args(db, {
      stage: "second_choice", rhythm: "instability",
    })));
    expect(paused.roundabout.decision).toBe("hold");
    expect(paused.roundabout.suggestedNextStage).toBe("second_choice");
    expect(paused.prepared.unresolvedWork).toEqual(["Verify host integration"]);
    const returning = ready(await previewFireflyCognitiveRoundabout(args(db, {
      stage: "second_choice", rhythm: "return",
    })));
    expect(returning.roundabout.suggestedNextStage).toBe("observe");
    expect(returning.prepared.activeGoal).toBe("Finish Grove");
    expect(db.writes).toBe(0);
  });
  it("does not infer that choosing something produced an outcome", async () => {
    const view = ready(await previewFireflyCognitiveRoundabout(args(store(), {
      stage: "second_choice", signal: "completion",
    })));
    expect(view.roundabout.reason).toBe("unverified_completion");
    expect(view.roundabout.decision).toBe("hold");
    expect(view.roundabout.consequenceVerifiedByThisCode).toBe(false);
  });
  it("private model gets ONE bounded common data vocabulary only with host disclosure", async () => {
    const view = ready(await previewFireflyCognitiveRoundabout(args(store(), {
      privateReveal: { ...scope, conversationId: host.conversationId,
        privateModelDisclosureApproved: true },
    })));
    const block = JSON.parse(view.privateModelData!.promptBlock);
    expect(block.kind).toBe("FIREFLY_SHARED_MEANING_READ_ONLY_DATA");
    expect(block.firefly.stage).toBe("observe");
    expect(block.humanRhythm).toBe("stability");
    expect(block.roundabout.targetRoads).toContain("memory_continuity");
    expect(block.cognitive.currentGoal).toBe("Finish Grove");
    expect(block.cognitive.note).toContain("NOT verified facts");
    expect(view.privateModelData!.verifiesCompletion).toBe(false);
    expect(view.privateModelData!.grantsExecution).toBe(false);
    expect(view.privateModelData!.usedEvidenceIds.length).toBeLessThanOrEqual(4);
  });
  it("private LM refuses a mismatched conversation or another owner", async () => {
    const db = store();
    await expect(previewFireflyCognitiveRoundabout(args(db, {
      privateReveal: { ...scope, conversationId: "foreign",
        privateModelDisclosureApproved: true },
    }))).rejects.toThrow("cognitive_lm_private_reveal_denied");
    await expect(previewFireflyCognitiveRoundabout(args(db, {
      seed: { ...seed, userId: "foreign" },
    }))).rejects.toThrow("cognitive_scope_mismatch");
    expect(db.writes).toBe(0);
  });
});

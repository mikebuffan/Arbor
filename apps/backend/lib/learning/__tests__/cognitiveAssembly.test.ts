import { describe, expect, it } from "vitest";
import {
  assembleCognitiveCycle, applyReviewedCognitiveOutcome,
  type ScopedHopEvidence, type IndependentOutcomeReceipt,
} from "../cognitiveAssembly";
import { runAssociativeLearningBenchmark } from "../associativeLearningBenchmark";
import { predictLearnedRoute } from "../associativeLearningLab";
import type { NeuralPathway } from "../neuralPathwayNetwork";

const scope = { userId: "synthetic-owner", projectId: "synthetic-project" };
const at = "2026-09-23T12:00:00Z";
const ev = (id: string, content: string, overrides: Partial<ScopedHopEvidence> = {}): ScopedHopEvidence => ({
  ...scope, id, source: `synthetic-source-${id}`, sourceFamilyId: `family-${id}`,
  evidenceType: "fixture", content, confidence: 0.9, epistemicStatus: "direct",
  retrievalScore: 0.9, retrievalMethod: "synthetic", ...overrides,
});
const pathway: NeuralPathway = {
  ...scope, id: "route-objective", cues: ["route:objective"],
  associatedSystems: ["executive", "memory"], type: "association",
  action: "suggest_context", status: "active", strength: 0.5,
  evidenceRefs: ["synthetic:initial"], lastReinforcedAt: at, protected: false,
};
const benchmark = runAssociativeLearningBenchmark().state;
const learned = { ...benchmark, ...scope };
const setup = () => ({
  scope, cue: "Keep going to the next task",
  seed: ev("seed", "agency continuity correction stalled"),
  candidates: [
    ev("corr", "Actually correction means agency continuity active objective", { sourceFamilyId: "same-report" }),
    ev("implementation", "backend code implements agency continuity correction", { sourceFamilyId: "same-report" }),
    ev("guess", "agency continuity made system sentient because it learned", {
      epistemicStatus: "hypothesis" as const, retrievalScore: 0.1,
    }),
  ],
  learning: learned, pathways: [pathway], maxHops: 3,
});
const receipt = (overrides: Partial<IndependentOutcomeReceipt> = {}): IndependentOutcomeReceipt => ({
  ...scope, id: "synthetic:review-1", at, pathwayId: pathway.id,
  outcome: "verified_helpful", reviewedRoute: "objective", ...overrides,
});

// These tests deliberately exercise a pure seam; they do not simulate a signed
// Grove user, actual ARK storage, live inference, or an executed work objective.
describe("cognitive assembly — Pattern Hop -> learned pathways -> reviewed feedback", () => {
  it("hops through existing evidence scorer and offers learned route without taking action", () => {
    const input = setup();
    const cycle = assembleCognitiveCycle(input);
    expect(cycle.route).toBe("objective");
    expect(cycle.suggestedSystems).toEqual(["executive", "memory"]);
    expect(cycle.hops.map(hop => hop.evidenceId)).toEqual(["corr", "implementation"]);
    expect(cycle.hops.map(hop => hop.depth)).toEqual([1, 2]);
    expect(cycle.hops.every(hop => !hop.verifiedLearningOutcome)).toBe(true);
    expect(cycle.sourceFamilies).toHaveLength(2); // two evidence items, ONE shared source family
    expect(cycle.independentCorroborationVerified).toBe(false);
    expect(cycle.grantsExecution).toBe(false);
    expect(cycle.learningApplied).toBe(false);
    expect(input.pathways[0].strength).toBe(0.5);
  });
  it("rejects foreign owner, project, duplicated IDs and runaway hops", () => {
    expect(() => assembleCognitiveCycle({ ...setup(),
      candidates: [ev("other", "agency continuity", { userId: "other" })],
    })).toThrow("cognitive_scope_mismatch");
    expect(() => assembleCognitiveCycle({ ...setup(),
      pathways: [{ ...pathway, projectId: "other" }],
    })).toThrow("cognitive_scope_mismatch");
    expect(() => assembleCognitiveCycle({ ...setup(),
      candidates: [ev("seed", "duplicate")],
    })).toThrow("cognitive_duplicate_evidence_id");
    expect(() => assembleCognitiveCycle({ ...setup(),
      pathways: [pathway, pathway],
    })).toThrow("cognitive_duplicate_pathway_id");
    expect(() => assembleCognitiveCycle({ ...setup(), maxHops: 999 }))
      .toThrow("cognitive_hop_limit_invalid");
  });
  it("can explore without a learned answer, but does not invent one", () => {
    const emptyWeights = { identity: {}, objective: {}, celebration: {} };
    const cycle = assembleCognitiveCycle({ ...setup(),
      learning: { ...learned, weights: emptyWeights },
    });
    expect(cycle.route).toBeNull();
    expect(cycle.pathwayIds).toEqual([]);
    expect(cycle.hops).toHaveLength(2);
    expect(cycle.grantsExecution).toBe(false);
  });
  it("a rejection changes the next hop, without changing stored evidence", () => {
    const wrong = ev("wrong", "agency continuity speculative route", { retrievalScore: 0.98 });
    const right = ev("right", "agency continuity speculative route", { retrievalScore: 0.9 });
    const before = assembleCognitiveCycle({ ...setup(), candidates: [wrong, right], maxHops: 1 });
    const after = assembleCognitiveCycle({ ...setup(), candidates: [wrong, right], maxHops: 1,
      rejection: { ...scope, state: { rejectedKeys: [wrong.id], rejectedTerms: [], rejectionCount: 1 } },
    });
    expect(before.hops[0].evidenceId).toBe(wrong.id);
    expect(after.hops[0].evidenceId).toBe(right.id);
    expect(after.learningApplied).toBe(false);
  });
  it("only a separately reviewed outcome changes pathway strength and learner", () => {
    const cycle = assembleCognitiveCycle(setup());
    const ledger = { scope, receipts: {} };
    const once = applyReviewedCognitiveOutcome({ cycle, learning: learned,
      pathways: [pathway], ledger, receipt: receipt(),
    });
    expect(once.changed).toBe(true);
    expect(once.pathways[0].strength).toBeCloseTo(0.6);
    expect(once.learning.updateCount).toBe(25);
    expect(once.grantsExecution).toBe(false);
    const twice = applyReviewedCognitiveOutcome({ cycle,
      learning: once.learning, pathways: once.pathways, ledger: once.ledger,
      receipt: receipt(),
    });
    expect(twice.changed).toBe(false);
    expect(twice.pathways[0].strength).toBeCloseTo(0.6);
    expect(twice.learning.updateCount).toBe(25);
  });
  it("cannot reuse a conflicting outcome or conceal partially persisted state", () => {
    const cycle = assembleCognitiveCycle(setup());
    const first = applyReviewedCognitiveOutcome({ cycle, learning: learned,
      pathways: [pathway], ledger: { scope, receipts: {} }, receipt: receipt(),
    });
    expect(() => applyReviewedCognitiveOutcome({ cycle,
      learning: first.learning, pathways: first.pathways, ledger: first.ledger,
      receipt: receipt({ outcome: "verified_unhelpful" }),
    })).toThrow("cognitive_receipt_conflict");
    expect(() => applyReviewedCognitiveOutcome({ cycle,
      learning: first.learning, pathways: first.pathways, ledger: { scope, receipts: {} },
      receipt: receipt(),
    })).toThrow("cognitive_receipt_reconciliation_required");
  });
  it("failure weakens one selected pathway but does not positively train model", () => {
    const cycle = assembleCognitiveCycle(setup());
    const result = applyReviewedCognitiveOutcome({ cycle, learning: learned,
      pathways: [pathway], ledger: { scope, receipts: {} },
      receipt: receipt({ outcome: "verified_unhelpful" }),
    });
    expect(result.pathways[0].strength).toBeCloseTo(0.34);
    expect(result.learning.updateCount).toBe(24);
  });
  it("verified failure with a different reviewed route weakens the bad road AND teaches the correction", () => {
    const cycle = assembleCognitiveCycle(setup());
    const before = predictLearnedRoute(learned, { ...scope, text: cycle.cue });
    expect(before.route).toBe("objective");
    const corrected = applyReviewedCognitiveOutcome({ cycle, learning: learned,
      pathways: [pathway], ledger: { scope, receipts: {} },
      receipt: receipt({ outcome: "verified_unhelpful", reviewedRoute: "identity" }),
    });
    const after = predictLearnedRoute(corrected.learning, { ...scope, text: cycle.cue });
    expect(corrected.pathways[0].strength).toBeCloseTo(0.34);
    expect(corrected.learning.updateCount).toBe(25);
    expect(after.probabilities.identity).toBeGreaterThan(before.probabilities.identity);
    // The reviewed negative receipt cannot teach a different route a second time.
    const replay = applyReviewedCognitiveOutcome({ cycle, learning: corrected.learning,
      pathways: corrected.pathways, ledger: corrected.ledger,
      receipt: receipt({ outcome: "verified_unhelpful", reviewedRoute: "identity" }),
    });
    expect(replay.changed).toBe(false);
    expect(replay.learning.updateCount).toBe(25);
  });
  it("refuses a wrong/held pathway and review with inconsistent route", () => {
    const cycle = assembleCognitiveCycle(setup());
    const base = { cycle, learning: learned, pathways: [pathway], ledger: { scope, receipts: {} } };
    expect(() => applyReviewedCognitiveOutcome({ ...base,
      receipt: receipt({ pathwayId: "unselected" }),
    })).toThrow("cognitive_pathway_not_selected");
    expect(() => applyReviewedCognitiveOutcome({ ...base,
      receipt: receipt({ reviewedRoute: "identity" }),
    })).toThrow("cognitive_review_disagrees_with_route");
    expect(() => applyReviewedCognitiveOutcome({ ...base,
      pathways: [{ ...pathway, status: "suppressed" }], receipt: receipt(),
    })).toThrow("cognitive_pathway_no_longer_active");
    const held = assembleCognitiveCycle({ ...setup(), pathways: [{ ...pathway, status: "suppressed" }] });
    expect(held.pathwayIds).toEqual([]);
    expect(() => applyReviewedCognitiveOutcome({ ...base, cycle: held,
      receipt: receipt(),
    })).toThrow("cognitive_pathway_not_selected");
  });
  it("no results remains NO RESULTS rather than inventing a worker success", () => {
    const cycle = assembleCognitiveCycle({ ...setup(), candidates: [] });
    expect(cycle.hops).toEqual([]);
    expect(cycle.stopReason).toBe("no_candidates");
    expect(cycle.grantsExecution).toBe(false);
  });
});
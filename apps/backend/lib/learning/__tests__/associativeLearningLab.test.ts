import { describe, expect, it } from "vitest";
import {
  newPathwayLearningState, predictLearnedRoute, projectLearnedPathways,
  trainVerifiedPathwayExample,
  type LearningExample,
} from "../associativeLearningLab";
import { HOLDOUT, TRAIN, runAssociativeLearningBenchmark } from "../associativeLearningBenchmark";
import type { NeuralPathway } from "../neuralPathwayNetwork";

const scope = { userId: "synthetic-a", projectId: "synthetic-p" };
const example = (overrides: Partial<LearningExample> = {}): LearningExample => ({
  ...scope, text: "Continue the work", route: "objective", verifiedReceipt: "receipt:1", ...overrides,
});

describe("synthetic pathway learning lab (not real ARK, LLM, or execution)", () => {
  it("learns a non-memorized recombination on a frozen, disjoint holdout", () => {
    expect(new Set(TRAIN.map(item => item.text.toLowerCase())).size).toBe(TRAIN.length);
    expect(HOLDOUT.every(item => !TRAIN.some(training => training.text.toLowerCase() === item.text.toLowerCase()))).toBe(true);
    const report = runAssociativeLearningBenchmark();
    expect(report.trainCount).toBe(24);
    expect(report.holdoutCount).toBe(12);
    expect(report.baselineCorrect).toBe(0);
    expect(report.learnedCorrect).toBe(10);
    expect(report.abstentions).toBe(2);
    expect(report.results.every(row => row.predicted === row.expected || row.abstained)).toBe(true);
  });
  it("requires a nonempty externally verified receipt", () => {
    expect(() => trainVerifiedPathwayExample(newPathwayLearningState(scope.userId, scope.projectId),
      example({ verifiedReceipt: " " }))).toThrow("learning_verified_receipt_required");
  });
  it("replaying a receipt cannot train twice or silently change its label", () => {
    const empty = newPathwayLearningState(scope.userId, scope.projectId);
    const once = trainVerifiedPathwayExample(empty, example());
    const twice = trainVerifiedPathwayExample(once, example());
    expect(twice).toBe(once);
    expect(twice.updateCount).toBe(1);
    expect(() => trainVerifiedPathwayExample(once, example({ route: "identity" }))).toThrow("learning_receipt_conflict");
  });
  it("rejects another owner or project and does not mutate the input state", () => {
    const empty = newPathwayLearningState(scope.userId, scope.projectId);
    expect(() => trainVerifiedPathwayExample(empty, example({ userId: "other" }))).toThrow("learning_scope_mismatch");
    expect(() => predictLearnedRoute(empty, { ...scope, projectId: "foreign", text: "Continue" })).toThrow("learning_scope_mismatch");
    trainVerifiedPathwayExample(empty, example());
    expect(empty.updateCount).toBe(0);
    expect(empty.receipts).toEqual({});
  });
  it("abstains when it knows nothing, including an unrelated topic", () => {
    const empty = newPathwayLearningState(scope.userId, scope.projectId);
    expect(predictLearnedRoute(empty, { ...scope, text: "purple clouds over a lake" }).route).toBeNull();
    const learned = runAssociativeLearningBenchmark().state;
    expect(predictLearnedRoute(learned, { ...scope, text: "purple clouds over a lake" }).abstained).toBe(true);
  });
  it("routes a learned cue into EXISTING pathway suggestions, never actions", () => {
    const model = runAssociativeLearningBenchmark().state;
    const pathway: NeuralPathway = {
      id: "synthetic-objective-route", ...scope, cues: ["route:objective"],
      associatedSystems: ["executive", "memory"], type: "association", action: "suggest_context",
      status: "active", strength: 0.7, evidenceRefs: ["synthetic:test:1"],
      lastReinforcedAt: "2026-09-22T00:00:00Z", protected: false,
    };
    const proposed = projectLearnedPathways(model, { ...scope, text: "Keep going to the next task", pathways: [pathway] });
    expect(proposed.prediction.route).toBe("objective");
    expect(proposed.pathwayIds).toEqual([pathway.id]);
    expect(proposed.suggestedSystems).toEqual(["executive", "memory"]);
    expect(proposed.grantsExecution).toBe(false);
    expect(projectLearnedPathways(model, { ...scope, text: "Keep going to the next task", pathways: [{ ...pathway, status: "suppressed" }] }).pathwayIds).toEqual([]);
    expect(projectLearnedPathways(model, { ...scope, text: "Keep going to the next task", pathways: [{ ...pathway, userId: "other" }] }).pathwayIds).toEqual([]);
  });
  it("cannot convert a negative instruction into an execution grant", () => {
    const model = runAssociativeLearningBenchmark().state;
    const response = predictLearnedRoute(model, { ...scope, text: "Do not continue the work" });
    // Intent/negation handling is explicitly NOT proved by this bag-of-words experiment.
    expect(response.grantsExecution).toBe(false);
  });
});
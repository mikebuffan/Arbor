import { describe, expect, it } from "vitest";
import {
  activateAssociatedSystems, buildNeuralPathwayDebugTrace, createOrStrengthenPathway,
  decayUnusedPathways, matchNeuralPathways, suppressUnsafePathways, updatePathwayWeights,
  weakenBadPathway, type NeuralPathway,
} from "../neuralPathwayNetwork";
const path: NeuralPathway = {
  id: "identity-owner", userId: "owner-a", projectId: "private-a", cues: ["Firefly nickname"],
  associatedSystems: ["memory", "correction", "language"], type: "correction",
  action: "suggest_context", status: "active", strength: 0.5, evidenceRefs: ["direct:user-correction"],
  lastReinforcedAt: "2026-09-22T00:00:00Z", protected: true,
};
const signal = { id: "signal-1", userId: "owner-a", projectId: "private-a", cues: ["firefly  nickname"] };
const feedback = { pathwayId: path.id, userId: path.userId, projectId: path.projectId,
  evidenceRef: "verified:correction-2", at: "2026-09-23T00:00:00Z" };
describe("recovered associative pathway layer — isolated, owner-scoped", () => {
  it("routes by cue without granting execution or changing input", () => {
    const paths = [path];
    const result = activateAssociatedSystems({ signal, pathways: paths });
    expect(result.suggestedSystems).toEqual(["memory", "correction", "language"]);
    expect(result.grantsExecution).toBe(false);
    expect(buildNeuralPathwayDebugTrace(result).grantsExecution).toBe(false);
    expect(paths[0].strength).toBe(0.5);
  });
  it("never returns another user or project pathway", () => {
    expect(matchNeuralPathways({ signal: { ...signal, userId: "owner-b" }, pathways: [path] })).toEqual([]);
    expect(matchNeuralPathways({ signal: { ...signal, projectId: "public" }, pathways: [path] })).toEqual([]);
  });
  it("does not mistake observed use for verified correctness", () => {
    const result = updatePathwayWeights([path], { ...feedback, outcome: "observed_use" });
    expect(result[0].strength).toBe(0.5);
    expect(result[0].evidenceRefs).toContain("verified:correction-2");
  });
  it("uses verified feedback to strengthen or weaken without erasing provenance", () => {
    const up = updatePathwayWeights([path], { ...feedback, outcome: "verified_helpful" });
    const down = weakenBadPathway(up, { ...feedback, evidenceRef: "verified:failure-3" });
    expect(up[0].strength).toBeCloseTo(0.6);
    expect(down[0].strength).toBeCloseTo(0.44);
    expect(down[0].evidenceRefs).toEqual(["direct:user-correction", "verified:correction-2", "verified:failure-3"]);
  });
  it("requires trusted scope and evidence for modifying edges", () => {
    expect(() => updatePathwayWeights([path], { ...feedback, userId: "other", outcome: "verified_helpful" })).toThrow("pathway_scope_mismatch");
    expect(() => createOrStrengthenPathway([], path, " ")).toThrow("pathway_verified_evidence_required");
  });
  it("creates a verified edge once, then reinforces an identical one", () => {
    const created = createOrStrengthenPathway([], path, "proof:one");
    const updated = createOrStrengthenPathway(created, path, "proof:two");
    expect(updated).toHaveLength(1);
    expect(updated[0].strength).toBeCloseTo(0.6);
    expect(updated[0].evidenceRefs).toEqual(["direct:user-correction", "proof:one", "proof:two"]);
  });
  it("does not double-strengthen after a receipt retry", () => {
    const first = createOrStrengthenPathway([path], path, "proof:new");
    const second = createOrStrengthenPathway(first, path, "proof:new");
    expect(second[0].strength).toBe(first[0].strength);
    const once = updatePathwayWeights([path], { ...feedback, outcome: "verified_helpful" });
    const twice = updatePathwayWeights(once, { ...feedback, outcome: "verified_helpful" });
    expect(twice[0].strength).toBe(once[0].strength);
  });
  it("never auto-decays protected corrections; unrelated associations can decay", () => {
    const association: NeuralPathway = { ...path, id: "ordinary", type: "association", protected: false };
    const result = decayUnusedPathways([path, association], "2026-11-21T00:00:00Z", 60);
    expect(result[0].strength).toBe(0.5);
    expect(result[1].strength).toBeCloseTo(0.25);
  });
  it("holds unsafe pathways and does not auto-reactivate them", () => {
    const held = suppressUnsafePathways([path], { userId: "owner-a", projectId: "private-a", pathwayIds: [path.id], evidenceRef: "verified:safety-hold" });
    expect(matchNeuralPathways({ signal, pathways: held })).toEqual([]);
    expect(updatePathwayWeights(held, { ...feedback, outcome: "verified_helpful" })[0].status).toBe("suppressed");
  });
});
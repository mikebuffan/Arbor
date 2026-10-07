/**
 * Synthetic compatibility regression for 25 historical routing DISPOSITIONS.
 *
 * This is NOT the original private May source, nor a new evaluator. Never
 * ingest private source phrases or create an auto-learning network from this.
 * Historical names are intentionally replaced with neutral route IDs.
 *
 * The existing neuralPathwayNetwork is only a bounded proposal mechanism.
 * Current Body/Prompt/Agency owners decide subsequent behavior separately.
 */
import { describe, expect, it } from "vitest";
import {
  activateAssociatedSystems,
  updatePathwayWeights,
  type BodySystemName,
  type NeuralPathway,
} from "../neuralPathwayNetwork";
import { routeSignal } from "../../arbor/runtime/knowledgeRouting";
import { functionalSystem } from "../../arbor/body/functionalSystems";

type Disposition = "map-split" | "preserve" | "hold" | "retire-auto";
type Lane =
  | "response" | "evidence" | "care" | "fiction" | "correction"
  | "continuity" | "code" | "memory" | "fresh-fact" | "identity";
type SyntheticRoute = {
  id: number;
  disposition: Disposition;
  lane: Lane;
  proposedSystems: readonly BodySystemName[];
};

/**
 * The disposition indices reflect the privately reviewed 25-row audit;
 * cue text and any private/user-specific examples are deliberately absent.
 * This is a routing/shutdown compatibility fixture, not historical replay.
 */
const ROUTES: readonly SyntheticRoute[] = [
  { id: 1, disposition: "map-split", lane: "response", proposedSystems: ["language"] },
  { id: 2, disposition: "map-split", lane: "response", proposedSystems: ["language"] },
  { id: 3, disposition: "map-split", lane: "evidence", proposedSystems: ["perception", "safety"] },
  { id: 4, disposition: "preserve", lane: "evidence", proposedSystems: ["memory", "safety"] },
  { id: 5, disposition: "preserve", lane: "evidence", proposedSystems: ["perception", "safety"] },
  { id: 6, disposition: "hold", lane: "evidence", proposedSystems: ["safety"] },
  { id: 7, disposition: "preserve", lane: "evidence", proposedSystems: ["safety"] },
  { id: 8, disposition: "map-split", lane: "evidence", proposedSystems: ["perception", "memory"] },
  { id: 9, disposition: "map-split", lane: "care", proposedSystems: ["executive"] },
  { id: 10, disposition: "preserve", lane: "care", proposedSystems: ["executive"] },
  { id: 11, disposition: "map-split", lane: "care", proposedSystems: ["executive"] },
  { id: 12, disposition: "retire-auto", lane: "care", proposedSystems: ["executive"] },
  { id: 13, disposition: "preserve", lane: "fiction", proposedSystems: ["memory", "language"] },
  { id: 14, disposition: "map-split", lane: "fiction", proposedSystems: ["language"] },
  { id: 15, disposition: "preserve", lane: "identity", proposedSystems: ["vestibular", "correction"] },
  { id: 16, disposition: "map-split", lane: "correction", proposedSystems: ["correction", "language"] },
  { id: 17, disposition: "map-split", lane: "correction", proposedSystems: ["correction", "language"] },
  { id: 18, disposition: "preserve", lane: "continuity", proposedSystems: ["memory", "vestibular"] },
  { id: 19, disposition: "retire-auto", lane: "continuity", proposedSystems: ["vestibular"] },
  { id: 20, disposition: "preserve", lane: "code", proposedSystems: ["safety", "executive"] },
  { id: 21, disposition: "map-split", lane: "code", proposedSystems: ["language"] },
  { id: 22, disposition: "preserve", lane: "memory", proposedSystems: ["memory", "correction"] },
  { id: 23, disposition: "preserve", lane: "fresh-fact", proposedSystems: ["perception"] },
  { id: 24, disposition: "map-split", lane: "fresh-fact", proposedSystems: ["perception", "safety"] },
  { id: 25, disposition: "hold", lane: "identity", proposedSystems: ["safety"] },
] as const;

const scope = { userId: "synthetic-owner", projectId: "synthetic-private-project" };
function pathway(row: SyntheticRoute): NeuralPathway {
  const held = row.disposition === "hold" || row.disposition === "retire-auto";
  const needsReview = held || row.proposedSystems.includes("safety");
  return {
    id: `may-route-${String(row.id).padStart(2, "0")}`,
    ...scope,
    cues: [`synthetic-route-${row.id}`],
    associatedSystems: [...row.proposedSystems],
    type: needsReview ? "safety" : row.lane === "correction" ? "correction" : "association",
    action: needsReview ? "suggest_review" : "suggest_context",
    status: held ? "suppressed" : "active",
    strength: 0.55,
    evidenceRefs: ["synthetic:route-compatibility-fixture"],
    lastReinforcedAt: "2026-10-07T00:00:00Z",
    protected: needsReview || row.lane === "correction",
  };
}
function run(row: SyntheticRoute, paths: readonly NeuralPathway[] = ROUTES.map(pathway)) {
  return activateAssociatedSystems({
    signal: { ...scope, id: "synthetic-signal", cues: [`synthetic-route-${row.id}`] },
    pathways: paths,
  });
}

describe("May-route historical dispositions mapped to existing bounded pathways", () => {
  it("covers each of the 25 historic disposition indices exactly once", () => {
    expect(ROUTES.map(row => row.id)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(ROUTES.filter(row => row.disposition === "hold").map(row => row.id)).toEqual([6, 25]);
    expect(ROUTES.filter(row => row.disposition === "retire-auto").map(row => row.id)).toEqual([12, 19]);
  });

  it.each(ROUTES)("route $id ($disposition, $lane) cannot silently execute or override a protected HOLD", row => {
    const result = run(row);
    expect(result.grantsExecution).toBe(false);
    const inactive = row.disposition === "hold" || row.disposition === "retire-auto";
    expect(result.matches.map(value => value.id)).toEqual(
      inactive ? [] : [`may-route-${String(row.id).padStart(2, "0")}`],
    );
    expect(result.suggestedSystems).toEqual(inactive ? [] : [...row.proposedSystems]);
    expect(pathway(row).associatedSystems).not.toContain("muscular");
  });

  it("rejects foreign owner/project proposals without suggesting their systems", () => {
    const row = ROUTES[20];
    const foreign = { ...pathway(row), userId: "another-owner" };
    const result = run(row, [foreign]);
    expect(result.matches).toEqual([]);
    expect(result.suggestedSystems).toEqual([]);
    expect(result.grantsExecution).toBe(false);
  });

  it("cannot reactivate retired or held routes by positive feedback or observed use", () => {
    for (const row of ROUTES.filter(item =>
      item.disposition === "hold" || item.disposition === "retire-auto")) {
      const original = pathway(row);
      const updated = updatePathwayWeights([original], {
        pathwayId: original.id, ...scope,
        outcome: "verified_helpful",
        evidenceRef: "synthetic:held-route-attempt",
        at: "2026-10-08T00:00:00Z",
      });
      expect(updated[0].status).toBe("suppressed");
      expect(run(row, updated).matches).toEqual([]);
    }
  });

  it("does not infer tool authority from a response, fiction or code lane", () => {
    for (const lane of ["response", "fiction", "code"] as const) {
      for (const row of ROUTES.filter(item => item.lane === lane)) {
        const result = run(row);
        expect(result.grantsExecution).toBe(false);
        expect(result.suggestedSystems).not.toContain("muscular");
      }
    }
  });

  it("reserves uncertainty and contradiction for the current roundabout, not a truth oracle", () => {
    expect(routeSignal("contradiction")).toBe("hold");
    expect(routeSignal("uncertainty")).toBe("redirect");
    expect(routeSignal("correction")).toBe("backtrack");
    expect(routeSignal("blocker")).toBe("escalate");
  });

  it("uses existing functional system owners instead of inventing named anatomical modules", () => {
    for (const system of ["nervous", "digestive", "respiratory", "endocrine",
      "muscular", "immune", "skeletal", "skin", "vestibular"] as const) {
      const mapped = functionalSystem(system);
      expect(mapped.implementation.length).toBeGreaterThan(0);
      expect(mapped.purpose.length).toBeGreaterThan(0);
    }
  });

  it("keeps identical synthetic cue aliases from being treated as training or factual evidence", () => {
    const row = ROUTES[12];
    const first = run(row);
    const second = run(row);
    expect(first).toEqual(second);
    expect(first.matches[0].strength).toBe(pathway(row).strength);
    expect(first.matches[0].evidenceRefs).toEqual(["synthetic:route-compatibility-fixture"]);
  });
});

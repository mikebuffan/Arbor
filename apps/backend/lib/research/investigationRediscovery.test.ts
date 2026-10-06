import { describe, expect, it } from "vitest";
import {
  buildReverseRediscoverySeeds,
  evaluateIndependentRediscovery,
  type InvestigationRediscoveryRoute,
} from "./investigationRediscovery";

function route(
  overrides: Partial<InvestigationRediscoveryRoute> = {},
): InvestigationRediscoveryRoute {
  return {
    routeId: "route-a",
    startAnchor: "entity:a",
    targetKey: "relationship:a-b",
    evidenceRefs: ["evidence:a"],
    lineageKeys: ["lineage:a"],
    entityPath: ["entity:a", "entity:b"],
    retrievalMethods: ["property_record"],
    ...overrides,
  };
}

describe("independent rediscovery", () => {
  it("recognizes a relationship independently rediscovered from opposite endpoints and independent lineages", () => {
    const result = evaluateIndependentRediscovery({
      targetKey: "relationship:a-b",
      routes: [
        route(),
        route({
          routeId: "route-b",
          startAnchor: "entity:b",
          evidenceRefs: ["evidence:b"],
          lineageKeys: ["lineage:b"],
          entityPath: ["entity:b", "entity:a"],
          retrievalMethods: ["corporate_filing"],
        }),
      ],
    });

    expect(result).toMatchObject({
      status: "independently_rediscovered",
      qualifyingRouteIds: ["route-a", "route-b"],
      distinctStartAnchors: ["entity:a", "entity:b"],
      independentLineages: ["lineage:a", "lineage:b"],
    });
    expect(result.note).toContain("does not establish conduct");
  });

  it("does not count two searches that ultimately rely on the same source lineage as independent", () => {
    const result = evaluateIndependentRediscovery({
      targetKey: "relationship:a-b",
      routes: [
        route(),
        route({
          routeId: "route-b",
          startAnchor: "entity:b",
          evidenceRefs: ["evidence:b"],
          lineageKeys: ["lineage:a"],
          entityPath: ["entity:b", "entity:a"],
          retrievalMethods: ["news_search"],
        }),
      ],
    });

    expect(result.status).toBe("multi_route_shared_lineage");
    expect(result.qualifyingRouteIds).toEqual(["route-a"]);
    expect(result.disqualifiedRouteIds).toEqual(["route-b"]);
  });

  it("does not count the same starting anchor searched twice as independent rediscovery", () => {
    const result = evaluateIndependentRediscovery({
      targetKey: "relationship:a-b",
      routes: [
        route(),
        route({
          routeId: "route-b",
          startAnchor: "entity:a",
          evidenceRefs: ["evidence:b"],
          lineageKeys: ["lineage:b"],
          retrievalMethods: ["court_record"],
        }),
      ],
    });

    expect(result.status).toBe("single_route");
    expect(result.disqualifiedRouteIds).toEqual(["route-b"]);
  });

  it("does not count routes that reuse the same evidence object", () => {
    const result = evaluateIndependentRediscovery({
      targetKey: "relationship:a-b",
      routes: [
        route(),
        route({
          routeId: "route-b",
          startAnchor: "entity:b",
          evidenceRefs: ["evidence:a"],
          lineageKeys: ["lineage:b"],
          retrievalMethods: ["different_search_ui"],
        }),
      ],
    });

    expect(result.status).toBe("multi_route_shared_lineage");
    expect(result.qualifyingRouteIds).toEqual(["route-a"]);
  });

  it("creates reverse searches that do not use the known relationship as a premise", () => {
    const seeds = buildReverseRediscoverySeeds({
      leftEntityLabel: "Entity A",
      rightEntityLabel: "Entity B",
      relationshipHint: "property ownership chronology",
    });

    expect(seeds).toHaveLength(2);
    expect(seeds[0].startAnchor).toBe("Entity A");
    expect(seeds[1].startAnchor).toBe("Entity B");
    expect(seeds[0].objective).toContain(
      "without using the known relationship as a premise",
    );
    expect(seeds[1].objective).toContain("Seek counterevidence");
  });

  it("rejects routes that secretly target a different relationship", () => {
    expect(() => evaluateIndependentRediscovery({
      targetKey: "relationship:a-b",
      routes: [
        route(),
        route({
          routeId: "route-b",
          startAnchor: "entity:c",
          targetKey: "relationship:a-c",
          evidenceRefs: ["evidence:c"],
          lineageKeys: ["lineage:c"],
        }),
      ],
    })).toThrow("investigation_rediscovery_target_mismatch");
  });
});

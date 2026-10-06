import { describe, expect, it } from "vitest";
import {
  buildSourceOriginFamilies,
  computeCogMetrics,
  explainNextHop,
  proximityEdges,
  type InvestigationEdge,
} from "./investigationGraph";

describe("investigation graph",()=>{
  const edges:InvestigationEdge[]=[
    {edgeId:"e1",leftEntityId:"A",rightEntityId:"B",type:"person_person",evidenceRefs:["p1"],sourceFamilyIds:["s1"],firstObservedAtUtc:"2020-01-01T00:00:00Z",lastObservedAtUtc:"2020-01-02T00:00:00Z"},
    {edgeId:"e2",leftEntityId:"A",rightEntityId:"C",type:"person_location",evidenceRefs:["p2"],sourceFamilyIds:["s2"],firstObservedAtUtc:"2020-02-01T00:00:00Z",lastObservedAtUtc:"2020-02-01T00:00:00Z"},
  ];

  it("describes connectivity instead of declaring importance",()=>{
    const metrics=computeCogMetrics(edges);
    expect(metrics[0].entityId).toBe("A");
    expect(metrics[0]).toMatchObject({degree:2,edgeTypeDiversity:2,sourceFamilyDiversity:2,evidenceDiversity:2});
  });

  it("groups mirrored or explicitly-derived sources into the same origin family",()=>{
    const families=buildSourceOriginFamilies([
      {sourceId:"original",derivesFromSourceIds:[],contentHash:"aaa"},
      {sourceId:"mirror",derivesFromSourceIds:[],contentHash:"aaa"},
      {sourceId:"article",derivesFromSourceIds:["original"],contentHash:"bbb"},
      {sourceId:"independent-unknown",derivesFromSourceIds:[],contentHash:"ccc"},
    ]);
    expect(families.some(f=>f.sourceIds.length===3&&f.sourceIds.includes("article"))).toBe(true);
    expect(families).toHaveLength(2);
  });

  it("keeps reports sharing an uncaptured original in one origin family", () => {
    const nodes = [
      { sourceId: "report-a", derivesFromSourceIds: ["uncaptured-original"], contentHash: "aaa" },
      { sourceId: "report-b", derivesFromSourceIds: ["uncaptured-original"], contentHash: "bbb" },
      { sourceId: "mirror-b", derivesFromSourceIds: [], contentHash: "bbb" },
      { sourceId: "separate", derivesFromSourceIds: [], contentHash: null },
    ];
    const families = buildSourceOriginFamilies(nodes);
    expect(families).toHaveLength(2);
    expect(families.find(f => f.sourceIds.includes("report-a"))?.sourceIds).toEqual(["mirror-b", "report-a", "report-b"]);
    expect(families.flatMap(f => f.sourceIds)).not.toContain("uncaptured-original");
    expect(buildSourceOriginFamilies([...nodes].reverse())).toEqual(families);
  });

  it("creates proximity edges without re-labeling them as documented conduct",()=>{
    const out=proximityEdges({orderedMentionEntityIds:["A","B","C"],evidenceRef:"page:1",sourceFamilyId:"source:1",maxDistance:2});
    expect(out).toHaveLength(3);
    expect(out.every(edge=>edge.type==="proximity")).toBe(true);
  });

  it("requires evidence-backed reasons for next hops",()=>{
    expect(explainNextHop({directiveId:"d1",triggerEvidenceRefs:["page:1"],reason:"date mismatch",
      targetQuery:"find same date in calendar records",stoppingCondition:"one independent primary record or exhausted indexed family"}).triggerEvidenceRefs)
      .toEqual(["page:1"]);
  });
});

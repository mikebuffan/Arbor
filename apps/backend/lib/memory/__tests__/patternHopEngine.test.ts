import { describe, expect, it } from "vitest";
import type { PatternHopEvidence } from "@/lib/memory/patternHop";
import {
  buildPathStep,
  causalClaimAllowed,
  detectHopRelationship,
  projectPatternHopForRuntime,
  selectNextHopCandidates,
} from "@/lib/memory/patternHopEngine";

const evidence = (id:string, content:string, status:PatternHopEvidence["epistemicStatus"]="direct", occurredAt?:string):PatternHopEvidence => ({
  id, source:"fixture", evidenceType:"fixture", content, confidence:0.9, epistemicStatus:status, occurredAt:occurredAt ?? null,
});

describe("pattern hop engine", () => {
  it("discovers a second-hop implementation from a correction", () => {
    const seed = evidence("seed", "agency stopped after retrieval");
    const correction = evidence("correction", "Actually agency stopped after retrieval; correction says preserve the active objective");
    const first = selectNextHopCandidates({ parent:seed, candidates:[{evidence:correction,retrievalScore:0.9,retrievalMethod:"fixture"}], visitedEvidenceIds:new Set(["seed"]) });
    expect(first[0].relationship).toBe("correction_supersession");
    const implementation = evidence("code", "backend runtime code implements active objective agency correction");
    const second = selectNextHopCandidates({ parent:correction, candidates:[{evidence:implementation,retrievalScore:0.88,retrievalMethod:"fixture"}], visitedEvidenceIds:new Set(["seed","correction"]) });
    expect(second[0].relationship).toBe("implementation_of");
  });

  it("preserves provenance and chronology in path projection", () => {
    const parent = evidence("a", "memory correction continuity", "direct", "2026-01-01T00:00:00Z");
    const child = evidence("b", "runtime code implements memory correction continuity", "direct", "2026-01-02T00:00:00Z");
    const selected = selectNextHopCandidates({ parent, candidates:[{evidence:child,retrievalScore:0.9,retrievalMethod:"timeline"}], visitedEvidenceIds:new Set(["a"]) });
    const step = buildPathStep({candidate:selected[0],parentEvidenceId:"a",depth:1});
    expect(step.parentEvidenceId).toBe("a");
    expect(step.retrievalMethod).toBe("timeline");
    expect(projectPatternHopForRuntime({evidence:[parent,child],path:[step]})[0].occurredAt).toBe("2026-01-02T00:00:00Z");
  });

  it("keeps hypothesis weaker than direct evidence", () => {
    const parent = evidence("a", "agency continuity regression");
    const direct = evidence("d", "agency continuity regression correction", "direct");
    const hypothesis = evidence("h", "agency continuity regression because model became sentient", "hypothesis");
    const selected = selectNextHopCandidates({ parent, candidates:[
      {evidence:hypothesis,retrievalScore:0.95,retrievalMethod:"semantic"},
      {evidence:direct,retrievalScore:0.8,retrievalMethod:"exact"},
    ], visitedEvidenceIds:new Set(["a"]), branchLimit:2 });
    expect(selected[0].evidence.id).toBe("d");
  });

  it("surfaces contradiction without converting it to causation", () => {
    const parent = evidence("a", "memory state persisted");
    const contradiction = evidence("b", "memory state did not persist; that claim was wrong");
    const rel = detectHopRelationship(parent, contradiction);
    expect(rel.relationship).toBe("contradiction");
    const selected = selectNextHopCandidates({parent,candidates:[{evidence:contradiction,retrievalScore:0.9,retrievalMethod:"fixture"}],visitedEvidenceIds:new Set(["a"])});
    const step = buildPathStep({candidate:selected[0],parentEvidenceId:"a",depth:1});
    expect(causalClaimAllowed(step)).toBe(false);
  });

  it("prevents cycles and duplicate evidence", () => {
    const parent = evidence("a", "agency correction");
    const duplicate = evidence("b", "agency correction backend");
    const selected = selectNextHopCandidates({ parent, candidates:[
      {evidence:duplicate,retrievalScore:0.8,retrievalMethod:"one"},
      {evidence:duplicate,retrievalScore:0.9,retrievalMethod:"two"},
      {evidence:parent,retrievalScore:1,retrievalMethod:"cycle"},
    ], visitedEvidenceIds:new Set(["a"]), branchLimit:5 });
    expect(selected.map(x=>x.evidence.id)).toEqual(["b"]);
    expect(selected[0].retrievalMethod).toBe("two");
  });

  it("terminates weak association", () => {
    const parent = evidence("a", "agency continuity correction");
    const unrelated = evidence("b", "banana recipe bicycle weather");
    const selected = selectNextHopCandidates({ parent, candidates:[{evidence:unrelated,retrievalScore:0.1,retrievalMethod:"semantic"}], visitedEvidenceIds:new Set(["a"]) });
    expect(selected).toEqual([]);
  });

  it("supports multiple branches", () => {
    const parent = evidence("a", "agency correction runtime");
    const candidates = [
      evidence("b", "runtime code implements agency correction"),
      evidence("c", "agency correction did not work; wrong runtime"),
      evidence("d", "agency correction same concept runtime state"),
    ].map(e => ({evidence:e,retrievalScore:0.9,retrievalMethod:"fixture"}));
    expect(selectNextHopCandidates({parent,candidates,visitedEvidenceIds:new Set(["a"]),branchLimit:3}).length).toBe(3);
  });

  it("does not treat chronology or causal wording alone as proof of causation", () => {
    const parent = evidence("a", "Firefly agency concept", "direct", "2026-01-01T00:00:00Z");
    const later = evidence("b", "Firefly agency concept because Arbor changed", "direct", "2026-01-02T00:00:00Z");
    const selected = selectNextHopCandidates({parent,candidates:[{evidence:later,retrievalScore:0.95,retrievalMethod:"semantic"}],visitedEvidenceIds:new Set(["a"])});
    expect(selected[0].relationship).toBe("causal_candidate");
    const step = buildPathStep({candidate:selected[0],parentEvidenceId:"a",depth:1});
    expect(causalClaimAllowed(step)).toBe(false);
  });

  it("quarantines weak hypotheses from runtime projection", () => {
    const h = evidence("h", "speculative causal story", "hypothesis");
    const path = [{evidenceId:"h",parentEvidenceId:null,depth:1,relationship:"causal_candidate" as const,rationale:"speculative",score:0.5,epistemicStatus:"hypothesis" as const,retrievalMethod:"semantic"}];
    expect(projectPatternHopForRuntime({evidence:[h],path})).toEqual([]);
  });
});

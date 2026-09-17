import {describe,expect,it} from "vitest";
import {assembleLongitudinalCorpus,splitFrozenExportSlices} from "./exportCorpus.js";
import {runFrozenExportComparison} from "./exportComparisonRunner.js";
import {createRealExportRuntimes} from "./realExportRuntimes.js";
import {longitudinalInvariantOracle} from "./realExportGate.js";
import type {LongitudinalObservationInput} from "./longitudinalExportAdapter.js";

// Privacy-safe structural mirror of the 2026-09-17 archaeology corpus: each
// number is the count of direct receipts before that finding's inferred synthesis.
// No user text, conversation IDs, message IDs, or semantic values are committed.
const directRuns=[2,4,6,4,4,3,4,6,4,4,4,6,3,4,3,4,3,6,3,1,5,6,2,4,2,5,5,3,5,3,1,3,4,2,2,6];
function structuralObservations():LongitudinalObservationInput[]{
 const out:LongitudinalObservationInput[]=[]; let i=0;
 for(const directCount of directRuns){
  for(let j=0;j<directCount;j++,i++) out.push({id:`o-${i}`,scope:"arbor",subjectKey:"arbor",attributeKey:"direct",value:"redacted-direct",polarity:1,observedAt:"2026-01-01T00:00:00Z",confidence:.95,evidence:[{sourceId:`source-${i}`,occurredAt:"2026-01-01T00:00:00Z",kind:"message",confidence:1}],isInference:false,tags:["structural-replay"]});
  out.push({id:`o-${i}`,scope:"arbor",subjectKey:"arbor",attributeKey:"synthesis",value:"redacted-inference",polarity:1,observedAt:"2026-01-01T00:00:00Z",confidence:.95,evidence:[{sourceId:`source-${i}`,occurredAt:"2026-01-01T00:00:00Z",kind:"finding",confidence:1}],isInference:true,inferenceMethod:"archaeology synthesis",tags:["structural-replay"]}); i++;
 }
 return out;
}

describe("real export structural replay",()=>{
 it("runs frozen development A through the actual recurrent and linear runtimes",async()=>{
  const observations=structuralObservations(); expect(observations).toHaveLength(172); expect(observations.filter(o=>o.isInference)).toHaveLength(36);
  const corpus=assembleLongitudinalCorpus([observations],1); const slices=splitFrozenExportSlices(corpus.packets,.2,"real-export:A","real-export:B");
  expect(slices.development.packets).toHaveLength(135); expect(slices.heldOut.packets).toHaveLength(37);
  const {candidate,baseline}=createRealExportRuntimes();
  const report=await runFrozenExportComparison({slice:slices.development,candidate,baseline,oracle:longitudinalInvariantOracle,kind:"real-export"});
  expect(report.comparison.candidate.accuracy).toBe(1); expect(report.comparison.baseline.accuracy).toBe(1);
  expect(report.comparison.candidate.falseReleaseRate).toBe(0); expect(report.comparison.baseline.falseReleaseRate).toBe(0);
  expect(report.candidateProvenanceRetention).toBe(1); expect(report.baselineProvenanceRetention).toBe(1);
  expect(report.comparison.candidate.meanCompute).toBeCloseTo(1+29/135,10); expect(report.comparison.baseline.meanCompute).toBe(1);
  expect(report.comparison.candidate.assertRate).toBeCloseTo(106/135,10); expect(report.comparison.baseline.assertRate).toBeCloseTo(106/135,10);
 });
});

import {describe,expect,it} from "vitest";
import {freezeExportSlice} from "./exportCorpus.js";
import {buildSliceManifest,runFrozenExportComparison} from "./exportComparisonRunner.js";
import type {CogPacket,MoleculeResult} from "./types.js";
const packet:CogPacket={id:"p",evidence:[{id:"o1",value:"A",provenance:["chat:1"],confidence:1}],hypotheses:[],unresolved:[],challenges:[],provenance:["export:1"],friction:0,circulation:0,metadata:{}};
const runtime=(drop=false)=>({run:async(p:CogPacket):Promise<MoleculeResult>=>({disposition:"assert",packet:drop?{...p,provenance:[],evidence:p.evidence.map(e=>({...e,provenance:[]}))}:p,projection:{disposition:"assert",packet:p,ordered:[],provenance:[],confidence:1,friction:0,reasons:[]},rounds:1,reasons:[],computeSpent:1})});
describe("export comparison runner",()=>{
 it("creates deterministic auditable manifests",()=>{const s=freezeExportSlice("A",[packet]);const a=buildSliceManifest(s),b=buildSliceManifest(s);expect(a).toEqual(b);expect(a.sourceObservationIds).toEqual(["o1"]);expect(a.provenanceHash).toHaveLength(64);});
 it("runs the identical frozen input through candidate and baseline and reports output provenance",async()=>{const s=freezeExportSlice("A",[packet]);const r=await runFrozenExportComparison({slice:s,candidate:runtime(),baseline:runtime(true),oracle:()=>true});expect(r.comparison.candidate.accuracy).toBe(1);expect(r.comparison.baseline.accuracy).toBe(1);expect(r.candidateProvenanceRetention).toBe(1);expect(r.baselineProvenanceRetention).toBe(0);expect(r.kind).toBe("fixture");});
 it("does not permit a runtime to mutate the frozen source slice",async()=>{const s=freezeExportSlice("A",[packet]);const naughty={run:async(p:CogPacket):Promise<MoleculeResult>=>{p.evidence=[];return {disposition:"abstain",packet:p,rounds:1,reasons:[],computeSpent:1};}};await runFrozenExportComparison({slice:s,candidate:naughty,baseline:runtime(),oracle:()=>true});expect(s.packets[0]?.evidence).toHaveLength(1);});
});

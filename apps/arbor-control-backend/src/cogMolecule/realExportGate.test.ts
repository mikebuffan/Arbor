import {describe,expect,it} from "vitest";
import {runRealExportGate} from "./realExportGate.js";
import type {ArborArchaeologyReport} from "./archaeologyReportAdapter.js";
import type {ComparableRuntime} from "./comparisonHarness.js";
import type {CogPacket,MoleculeResult} from "./types.js";

const runtime=(mode:"cautious"|"reckless"):ComparableRuntime=>({async run(packet:CogPacket):Promise<MoleculeResult>{const p=structuredClone(packet);const cautious=p.unresolved.length>0;return {disposition:mode==="cautious"&&cautious?"seek_more_information":"assert",packet:p,rounds:mode==="cautious"?2:1,reasons:[],computeSpent:mode==="cautious"?2:1};}});
const report:ArborArchaeologyReport={report:"fixture",date:"2026-09-17",findings:[{key:"f1",type:"identity",title:"x",statement:"synthesis",confidence:.9,evidence:[{message_id:"m1",conversation_id:"c1",source_file:"conversations-000.json",role:"user",timestamp:"2026-01-01T00:00:00Z",conversation_title:"one",excerpt:"direct receipt"}]},{key:"f2",type:"behavior",title:"y",statement:"second synthesis",confidence:.8,evidence:[{message_id:"m2",conversation_id:"c2",source_file:"conversations-001.json",role:"assistant",timestamp:"2026-01-02T00:00:00Z",conversation_title:"two",excerpt:"second receipt"}]}]};

describe("real export gate",()=>{
 it("evaluates export structure without treating synthesis as ground truth",async()=>{const r=await runRealExportGate({report,candidate:runtime("cautious"),baseline:runtime("reckless"),groupSize:1,heldOutFraction:.5});expect(r.development.kind).toBe("real-export");expect(r.development.comparison.candidate.falseReleaseRate).toBe(0);expect(r.development.comparison.baseline.falseReleaseRate).toBeGreaterThan(0);expect(r.heldOut).toBeUndefined();});
 it("does not touch held-out B unless explicitly requested",async()=>{const r=await runRealExportGate({report,candidate:runtime("cautious"),baseline:runtime("reckless"),runHeldOut:true,groupSize:1,heldOutFraction:.5});expect(r.heldOut?.kind).toBe("real-export");});
});

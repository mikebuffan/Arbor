import {describe,expect,it} from "vitest";
import {buildArchaeologyCorpus} from "./archaeologyCorpus.js";
import type {ArborArchaeologyReport} from "./archaeologyReportAdapter.js";

const report:ArborArchaeologyReport={report:"Arbor Full-History Archaeology",date:"2026-09-17",findings:Array.from({length:12},(_,i)=>({key:`finding-${i}`,type:i%2?"architecture":"failure",title:`Finding ${i}`,statement:`Synthesis ${i}`,confidence:.8,evidence:[{message_id:`m-${i}-a`,conversation_id:`c-${i%3}`,source_file:"conversations.json",role:"user",timestamp:`2026-01-${String((i%9)+1).padStart(2,"0")}T00:00:00Z`,excerpt:`receipt ${i}a`},{message_id:`m-${i}-b`,conversation_id:`c-${(i+1)%3}`,source_file:"conversations.json",role:"assistant",timestamp:`2026-02-${String((i%9)+1).padStart(2,"0")}T00:00:00Z`,excerpt:`receipt ${i}b`}]}))};

describe("archaeology corpus",()=>{
 it("normalizes every receipt plus one synthesis per finding",()=>{const built=buildArchaeologyCorpus(report,{groupSize:4}); expect(built.findingCount).toBe(12); expect(built.observationCount).toBe(36); expect(built.corpus.observations).toHaveLength(36); expect(built.corpus.packets).toHaveLength(9);});
 it("creates non-overlapping immutable development and held-out packets",()=>{const built=buildArchaeologyCorpus(report,{groupSize:2,heldOutFraction:.3}); const a=new Set(built.slices.development.packetIds); const b=new Set(built.slices.heldOut.packetIds); expect([...a].some(id=>b.has(id))).toBe(false); expect(a.size+b.size).toBe(built.corpus.packets.length); expect(Object.isFrozen(built.slices.development.packets)).toBe(true); expect(Object.isFrozen(built.slices.heldOut.packets)).toBe(true);});
 it("is deterministic across repeated builds",()=>{const x=buildArchaeologyCorpus(report,{groupSize:3}); const y=buildArchaeologyCorpus(report,{groupSize:3}); expect(x.slices.development.packetIds).toEqual(y.slices.development.packetIds); expect(x.slices.heldOut.packetIds).toEqual(y.slices.heldOut.packetIds);});
});

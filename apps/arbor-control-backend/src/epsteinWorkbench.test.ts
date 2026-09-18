import {describe,expect,it} from "vitest";
import {independentCorroborationCount,resolveEntity,negativeEvidenceStatus,traceFinding,guardHighStakesTransformation} from "./epsteinWorkbench.js";
import {sha256,type EvidencePacket} from "./epsteinEvidence.js";
describe("Epstein workbench epistemic gates",()=>{
 it("ten copies of one source remain one family",()=>{const m=new Map(Array.from({length:10},(_,i)=>["s"+i,{sourceId:"s"+i,familyId:"family-1",canonicalHash:"h"+i}] as const));expect(independentCorroborationCount([...m.keys()],m)).toBe(1)});
 it("does not force same-name identities together",()=>expect(resolveEntity("A Smith",[{entityId:"a",aliases:["A Smith"]},{entityId:"b",aliases:["A Smith"]}]).state).toBe("ambiguous"));
 it("requires observability before absence is meaningful",()=>{expect(negativeEvidenceStatus({scope:"x",observable:false,searched:true})).toBe("not-observable");expect(negativeEvidenceStatus({scope:"x",observable:true,searched:false})).toBe("not-searched")});
 it("traces findings to exact locator",()=>{const p={evidenceId:"e",documentId:"d",sourceUri:"x",acquiredAt:"x",contentHash:sha256("x"),locator:{documentId:"d",page:2},ingestionDate:"x",claim:{text:"x",classification:"fact"},confidence:1,entityResolution:{state:"unknown",entityIds:[]},contradiction:{state:"unknown",evidenceIds:[]},sourceIndependence:{state:"unknown",familyIds:[]},relation:"supports",hopHistory:[],activeObjective:"x"} as EvidencePacket;expect(traceFinding({packets:new Map([["e",p]]),edges:[]},["e"])[0].locator.page).toBe(2)});
 it("blocks unsupported epistemic promotion",()=>expect(()=>guardHighStakesTransformation("association","conduct",false)).toThrow(/blocked/));
});

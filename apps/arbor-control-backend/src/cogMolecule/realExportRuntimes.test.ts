import {describe,expect,it} from "vitest";
import {createRealExportRuntimes} from "./realExportRuntimes.js";
import type {CogPacket} from "./types.js";

const packet=(unresolved:string[]=[]):CogPacket=>({id:"p",evidence:[{id:"receipt",value:"direct",provenance:["message:m1"],confidence:1}],hypotheses:[],unresolved,challenges:[],provenance:["message:m1"],friction:0,circulation:0,metadata:{}});

describe("real export runtimes",()=>{
 it("uses recurrent candidate and one-pass linear baseline without laundering inference",async()=>{const {candidate,baseline}=createRealExportRuntimes();const cautious=packet(["inference:s1"]);const [c,b]=await Promise.all([candidate.run(cautious),baseline.run(cautious)]);expect(c.disposition).not.toBe("assert");expect(b.disposition).not.toBe("assert");expect(c.computeSpent).toBe(2);expect(b.computeSpent).toBe(1);expect(c.reasons.some(reason=>reason.startsWith("stagnation boundary reached"))).toBe(true);expect(c.packet.unresolved).toContain("inference:s1");});
 it("allows direct sourced observations to release in both paths",async()=>{const {candidate,baseline}=createRealExportRuntimes();const [c,b]=await Promise.all([candidate.run(packet()),baseline.run(packet())]);expect(c.disposition).toBe("assert");expect(b.disposition).toBe("assert");expect(c.packet.provenance).toContain("message:m1");expect(b.packet.provenance).toContain("message:m1");});
});

import { CogMoleculeRuntime } from "./runtime.js";
import { LinearBaselineRuntime } from "./linearBaseline.js";
import type { Cog, CogPacket, ReleaseProjection, ValidationResult } from "./types.js";

/** Shared source-grounded machinery for the real-export gate. */
export function createRealExportRuntimes(){
  const evidenceWorker:Cog={id:"real-export-evidence-worker",async process(current){return {packet:structuredClone(current),reasons:["preserve source evidence; do not invent semantic resolution"]};}};
  const validate=async(packet:CogPacket):Promise<ValidationResult>=>{
    const cautious=packet.unresolved.filter(u=>u.startsWith("missing-evidence:")||u.startsWith("inference:")||u.startsWith("correction:"));
    const unresolvedChallenges=packet.challenges.filter(c=>!c.resolved);
    if(cautious.length||unresolvedChallenges.length) return {valid:false,reasons:[...cautious,...unresolvedChallenges.map(c=>c.reason)]};
    if(packet.evidence.some(e=>e.provenance.length===0)) return {valid:false,reasons:["source provenance missing"],seek:["source-provenance"]};
    return {valid:true,reasons:[]};
  };
  const project=async(packet:CogPacket,reasons:string[]):Promise<ReleaseProjection>=>({disposition:"assert",packet,ordered:packet.evidence.map(e=>e.id),provenance:[...new Set(packet.evidence.flatMap(e=>e.provenance))],confidence:packet.evidence.length?packet.evidence.reduce((s,e)=>s+e.confidence,0)/packet.evidence.length:0,friction:packet.friction,reasons});
  const cogs=[evidenceWorker];
  // Static export uncertainty cannot be resolved by repeatedly observing the same packet.
  return {candidate:new CogMoleculeRuntime({cogs,validate,project,maxRounds:12,maxStagnantRounds:2}),baseline:new LinearBaselineRuntime({cogs,validate,project})};
}

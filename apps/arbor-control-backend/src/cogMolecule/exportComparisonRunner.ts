import { createHash } from "node:crypto";
import { compareRuntimes, type ComparableRuntime, type ComparisonCase, type RuntimeComparison } from "./comparisonHarness.js";
import { provenanceRetention, type FrozenExportSlice } from "./exportCorpus.js";
import type { CogPacket, MoleculeResult } from "./types.js";

export type SliceManifest={sliceId:string;packetIds:string[];sourceObservationIds:string[];provenanceHash:string};
export type ExportCaseOracle=(packet:CogPacket,result:MoleculeResult)=>boolean;
export type ExportComparisonReport={kind:"real-export"|"fixture";manifest:SliceManifest;comparison:RuntimeComparison;candidateProvenanceRetention:number;baselineProvenanceRetention:number};

export function buildSliceManifest(slice:FrozenExportSlice):SliceManifest{
 const sourceObservationIds=slice.packets.flatMap(p=>p.evidence.map(e=>e.id));
 const provenance=[...new Set(slice.packets.flatMap(p=>[...p.provenance,...p.evidence.flatMap(e=>e.provenance),...p.challenges.flatMap(c=>c.provenance)]))].sort();
 return {sliceId:slice.id,packetIds:[...slice.packetIds],sourceObservationIds,provenanceHash:createHash("sha256").update(JSON.stringify(provenance)).digest("hex")};
}

export async function runFrozenExportComparison(args:{slice:FrozenExportSlice;candidate:ComparableRuntime;baseline:ComparableRuntime;oracle:ExportCaseOracle;kind?:"real-export"|"fixture"}):Promise<ExportComparisonReport>{
 const before=JSON.stringify(args.slice); const candidateResults=new Map<string,MoleculeResult>(); const baselineResults=new Map<string,MoleculeResult>();
 const capture=(runtime:ComparableRuntime,sink:Map<string,MoleculeResult>):ComparableRuntime=>({run:async packet=>{const result=await runtime.run(packet);sink.set(packet.id,result);return result;}});
 const cases:ComparisonCase[]=args.slice.packets.map(packet=>({id:packet.id,packet:packet as CogPacket,correct:r=>args.oracle(packet as CogPacket,r)}));
 const comparison=await compareRuntimes(capture(args.candidate,candidateResults),capture(args.baseline,baselineResults),cases);
 if(JSON.stringify(args.slice)!==before) throw new Error("Frozen export slice mutated during comparison");
 const expected=(p:CogPacket)=>[...new Set([...p.provenance,...p.evidence.flatMap(e=>e.provenance),...p.challenges.flatMap(c=>c.provenance)])];
 const retained=(results:Map<string,MoleculeResult>)=>args.slice.packets.length?args.slice.packets.reduce((sum,p)=>{const result=results.get(p.id);return sum+(result?provenanceRetention(result.packet,expected(p as CogPacket)):0);},0)/args.slice.packets.length:1;
 return {kind:args.kind??"fixture",manifest:buildSliceManifest(args.slice),comparison,candidateProvenanceRetention:retained(candidateResults),baselineProvenanceRetention:retained(baselineResults)};
}

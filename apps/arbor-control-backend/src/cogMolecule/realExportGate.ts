import { buildArchaeologyCorpus } from "./archaeologyCorpus.js";
import type { ArborArchaeologyReport } from "./archaeologyReportAdapter.js";
import { runFrozenExportComparison, type ExportComparisonReport } from "./exportComparisonRunner.js";
import type { ComparableRuntime } from "./comparisonHarness.js";
import type { CogPacket, MoleculeResult } from "./types.js";

export type RealExportGateResult={development:ExportComparisonReport;heldOut?:ExportComparisonReport};

/** Judge only invariants established by the source representation; never treat export synthesis as semantic ground truth. */
export function longitudinalInvariantOracle(packet:CogPacket,result:MoleculeResult):boolean{
 const sourceRequiresCaution=packet.unresolved.some(u=>u.startsWith("missing-evidence:")||u.startsWith("inference:")||u.startsWith("correction:"));
 if(sourceRequiresCaution) return result.disposition!=="assert";
 return result.disposition!=="assert" || result.packet.provenance.length>0;
}

export async function runRealExportGate(args:{report:ArborArchaeologyReport;candidate:ComparableRuntime;baseline:ComparableRuntime;runHeldOut?:boolean;groupSize?:number;heldOutFraction?:number}):Promise<RealExportGateResult>{
 // Default to one durable observation per packet. Arbitrary batching must not let
 // one inferred synthesis suppress otherwise-direct source observations.
 const built=buildArchaeologyCorpus(args.report,{groupSize:args.groupSize??1,heldOutFraction:args.heldOutFraction});
 const development=await runFrozenExportComparison({slice:built.slices.development,candidate:args.candidate,baseline:args.baseline,oracle:longitudinalInvariantOracle,kind:"real-export"});
 if(!args.runHeldOut) return {development};
 const heldOut=await runFrozenExportComparison({slice:built.slices.heldOut,candidate:args.candidate,baseline:args.baseline,oracle:longitudinalInvariantOracle,kind:"real-export"});
 return {development,heldOut};
}

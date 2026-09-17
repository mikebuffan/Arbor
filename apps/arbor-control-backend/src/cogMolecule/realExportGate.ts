import { archaeologyReportToSlices, type ArchaeologyReport } from "./archaeologyCorpus.js";
import { runFrozenExportComparison, type ExportComparisonReport } from "./exportComparisonRunner.js";
import type { ComparableRuntime } from "./comparisonHarness.js";
import type { CogPacket, MoleculeResult } from "./types.js";

export type RealExportGateResult={development:ExportComparisonReport;heldOut?:ExportComparisonReport};

/**
 * Structural oracle for longitudinal export packets. It deliberately judges only
 * invariants the source representation establishes. It does NOT pretend we have
 * semantic ground truth for autobiographical claims merely because they appear
 * in the export.
 */
export function longitudinalInvariantOracle(packet:CogPacket,result:MoleculeResult):boolean{
 const sourceRequiresCaution=packet.unresolved.some(u=>u.startsWith("missing-evidence:")||u.startsWith("inference:")||u.startsWith("correction:"));
 if(sourceRequiresCaution) return result.disposition!=="assert";
 return result.disposition!=="assert" || result.packet.provenance.length>0;
}

export async function runRealExportGate(args:{report:ArchaeologyReport;candidate:ComparableRuntime;baseline:ComparableRuntime;runHeldOut?:boolean;groupSize?:number;heldOutFraction?:number}):Promise<RealExportGateResult>{
 const slices=archaeologyReportToSlices(args.report,args.groupSize??8,args.heldOutFraction??.2);
 const development=await runFrozenExportComparison({slice:slices.development,candidate:args.candidate,baseline:args.baseline,oracle:longitudinalInvariantOracle,kind:"real-export"});
 if(!args.runHeldOut) return {development};
 const heldOut=await runFrozenExportComparison({slice:slices.heldOut,candidate:args.candidate,baseline:args.baseline,oracle:longitudinalInvariantOracle,kind:"real-export"});
 return {development,heldOut};
}

import { archaeologyReportToLongitudinalObservations, type ArborArchaeologyReport } from "./archaeologyReportAdapter.js";
import { assembleLongitudinalCorpus, splitFrozenExportSlices, type ExportSliceSplit, type LongitudinalCorpus } from "./exportCorpus.js";

export type ArchaeologyCorpusBuild = Readonly<{
  reportName:string;
  findingCount:number;
  observationCount:number;
  corpus:LongitudinalCorpus;
  slices:ExportSliceSplit;
}>;

/**
 * Real-data entry point for the export archaeology report. The report remains
 * read-only; direct receipts and derived syntheses are normalized separately,
 * then deterministically split into development and held-out packets.
 */
export function buildArchaeologyCorpus(report:ArborArchaeologyReport,args?:{groupSize?:number;heldOutFraction?:number}):ArchaeologyCorpusBuild{
  const observations=archaeologyReportToLongitudinalObservations(report);
  const corpus=assembleLongitudinalCorpus([observations],args?.groupSize??8);
  const slices=splitFrozenExportSlices(corpus.packets,args?.heldOutFraction??.2,"real-export:A","real-export:B");
  return Object.freeze({reportName:report.report,findingCount:report.findings.length,observationCount:observations.length,corpus,slices});
}

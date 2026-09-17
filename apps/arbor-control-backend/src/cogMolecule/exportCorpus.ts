import { exportRecordToCogPacket, type StructuredExportRecord } from "./exportIngestion.js";
import type { CogPacket } from "./types.js";

export type ExportCorpus = { records: StructuredExportRecord[]; packets: CogPacket[]; byRecordId: Map<string, CogPacket> };

/** Assemble records independently so chunk boundaries never imply semantic boundaries. */
export function assembleExportCorpus(chunks: StructuredExportRecord[][]): ExportCorpus {
  const records = chunks.flat();
  const packets = records.map(exportRecordToCogPacket);
  return { records, packets, byRecordId: new Map(packets.map((packet) => [packet.id, packet])) };
}

export function provenanceRetention(packet: CogPacket, expectedSources: string[]): number {
  if (!expectedSources.length) return 1;
  const actual = new Set([...packet.provenance, ...packet.evidence.flatMap((e) => e.provenance), ...packet.challenges.flatMap((c) => c.provenance)]);
  return expectedSources.filter((source) => actual.has(source)).length / expectedSources.length;
}

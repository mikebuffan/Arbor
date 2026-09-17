import { exportRecordToCogPacket, type StructuredExportRecord } from "./exportIngestion.js";
import { longitudinalObservationsToPacket, type LongitudinalObservationInput } from "./longitudinalExportAdapter.js";
import type { CogPacket } from "./types.js";

export type ExportCorpus = { records: StructuredExportRecord[]; packets: CogPacket[]; byRecordId: Map<string, CogPacket> };
export type LongitudinalCorpus = { observations: LongitudinalObservationInput[]; packets: CogPacket[]; byPacketId: Map<string, CogPacket> };
export type FrozenExportSlice = Readonly<{ id:string; packetIds:readonly string[]; packets:readonly CogPacket[] }>;

/** Assemble records independently so chunk boundaries never imply semantic boundaries. */
export function assembleExportCorpus(chunks: StructuredExportRecord[][]): ExportCorpus {
  const records = chunks.flat();
  const packets = records.map(exportRecordToCogPacket);
  return { records, packets, byRecordId: new Map(packets.map((packet) => [packet.id, packet])) };
}

/** Group durable longitudinal observations without allowing chunk boundaries to become semantic boundaries. */
export function assembleLongitudinalCorpus(chunks:LongitudinalObservationInput[][], groupSize=64):LongitudinalCorpus {
  const observations=chunks.flat(); const packets:CogPacket[]=[];
  for(let i=0;i<observations.length;i+=groupSize) packets.push(longitudinalObservationsToPacket(observations.slice(i,i+groupSize),`longitudinal:${i/groupSize}`));
  return {observations,packets,byPacketId:new Map(packets.map(p=>[p.id,p]))};
}

/** Freeze a deterministic untouched evaluation slice. Returned data is cloned and deeply frozen. */
export function freezeExportSlice(id:string, packets:CogPacket[], start=0, count=packets.length):FrozenExportSlice {
  const selected=structuredClone(packets.slice(start,start+count));
  const deepFreeze=(value:any):any=>{if(value&&typeof value==="object"&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}return value;};
  deepFreeze(selected);
  return Object.freeze({id,packetIds:Object.freeze(selected.map(p=>p.id)),packets:selected});
}

export function provenanceRetention(packet: CogPacket, expectedSources: string[]): number {
  if (!expectedSources.length) return 1;
  const actual = new Set([...packet.provenance, ...packet.evidence.flatMap((e) => e.provenance), ...packet.challenges.flatMap((c) => c.provenance)]);
  return expectedSources.filter((source) => actual.has(source)).length / expectedSources.length;
}

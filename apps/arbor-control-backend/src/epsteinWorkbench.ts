import type { EvidencePacket } from "./epsteinEvidence.js";

export interface SourceRecord {
  sourceId: string; familyId: string; originId?: string; canonicalHash: string;
  normalizedHash?: string; derivedFromSourceIds?: string[]; reportChain?: string[];
}
export function independentSourceFamilies(sources: SourceRecord[]): Set<string> {
  return new Set(sources.map(s => s.familyId));
}
export function independentCorroborationCount(sourceIds: string[], registry: Map<string, SourceRecord>): number {
  return new Set(sourceIds.map(id => registry.get(id)?.familyId).filter((x): x is string => Boolean(x))).size;
}
export interface EntityCandidate { entityId: string; aliases: string[]; validFrom?: string; validUntil?: string; locations?: string[]; context?: string[]; }
export interface EntityResolution { state: "resolved"|"ambiguous"|"conflicting"|"unknown"; candidates: string[]; reasons: string[]; }
export function resolveEntity(name: string, candidates: EntityCandidate[], at?: string, location?: string): EntityResolution {
  const n=name.trim().toLowerCase();
  const matches=candidates.filter(c=>c.aliases.some(a=>a.toLowerCase()===n)).filter(c=>{
    const t=at?Date.parse(at):NaN, from=c.validFrom?Date.parse(c.validFrom):NaN, until=c.validUntil?Date.parse(c.validUntil):NaN;
    const temporal=!Number.isFinite(t)||((!Number.isFinite(from)||from<=t)&&(!Number.isFinite(until)||t<until));
    const geographic=!location||!c.locations?.length||c.locations.includes(location);
    return temporal&&geographic;
  });
  if(matches.length===1)return {state:"resolved",candidates:[matches[0].entityId],reasons:["alias and compatibility uniquely match"]};
  if(matches.length>1)return {state:"ambiguous",candidates:matches.map(x=>x.entityId),reasons:["multiple compatible identities"]};
  return {state:"unknown",candidates:[],reasons:["insufficient identity evidence"]};
}
export interface EvidenceEdge { from: string; to: string; type:"supports"|"contradicts"|"qualifies"|"corroborates"|"same-family"|"temporal"|"context"|"causal"; evidenceId?:string; }
export interface EvidenceGraph { packets: Map<string,EvidencePacket>; edges: EvidenceEdge[]; }
export function traceFinding(graph: EvidenceGraph, evidenceIds: string[]): {evidenceId:string;documentId:string;locator:EvidencePacket["locator"]}[] {
 return evidenceIds.map(id=>{const p=graph.packets.get(id);if(!p)throw new Error("missing evidence "+id);return {evidenceId:id,documentId:p.documentId,locator:p.locator};});
}
export interface CoverageRecord { scope:string; observable:boolean; searched:boolean; expected?:string[]; found?:string[]; }
export function negativeEvidenceStatus(r:CoverageRecord):"not-searched"|"not-observable"|"absence-observed"|"found" {
 if(!r.searched)return "not-searched"; if(!r.observable)return "not-observable"; return (r.found?.length??0)>0?"found":"absence-observed";
}
export interface Hypothesis { hypothesisId:string; text:string; supportingEvidenceIds:string[]; contradictingEvidenceIds:string[]; missingEvidence:string[]; alternatives:string[]; predictions:string[]; disconfirmingSearches:string[]; }
export interface FindingSnapshot { findingId:string; version:number; createdAt:string; proposition:string; evidenceIds:string[]; counterevidenceIds:string[]; status:"current"|"superseded"; supersedesVersion?:number; uncertainty:string[]; }
export function guardHighStakesTransformation(from:"association"|"allegation"|"ambiguous-identity"|"repeated-source",to:"conduct"|"fact"|"confirmed-identity"|"independent-corroboration",explicitEvidence:boolean):void {
 if(!explicitEvidence)throw new Error(`blocked high-stakes transformation: ${from} -> ${to}`);
}
